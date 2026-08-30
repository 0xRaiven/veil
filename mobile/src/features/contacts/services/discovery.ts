import Contacts from 'react-native-contacts';
import { PermissionsAndroid, Platform } from 'react-native';
import { PhoneNumberUtil, PhoneNumberFormat } from 'google-libphonenumber';
import crypto from 'react-native-quick-crypto';
import { supabase } from '../../../services/supabase/client';

const phoneUtil = PhoneNumberUtil.getInstance();

export interface DiscoveredContact {
  id: string; // Supabase user ID
  display_name: string;
  avatar_path: string | null;
  phone_hash: string;
  local_name: string; // How they are saved in the user's phone
}

export interface UnmatchedContact {
  local_name: string;
  raw_number: string;
}

export const requestContactsPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
      {
        title: 'Contacts Access',
        message: 'VEIL needs access to your contacts to find your friends.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } else {
    const permission = await Contacts.requestPermission();
    return permission === 'authorized';
  }
};

export const normalizePhoneNumber = (rawNumber: string, defaultRegion: string = 'US'): string | null => {
  try {
    const number = phoneUtil.parseAndKeepRawInput(rawNumber, defaultRegion);
    if (phoneUtil.isValidNumber(number)) {
      return phoneUtil.format(number, PhoneNumberFormat.E164);
    }
  } catch (e) {
    // Parsing failed
  }
  return null;
};

export const hashPhoneNumber = (normalizedNumber: string): string => {
  return crypto.createHash('sha256').update(normalizedNumber).digest('hex');
};

export const discoverContacts = async (defaultRegion: string = 'US') => {
  const hasPermission = await requestContactsPermission();
  if (!hasPermission) {
    throw new Error('Permission denied');
  }

  const contacts = await Contacts.getAll();
  
  // Map of hash -> local_name for quick lookup
  const localMap = new Map<string, string>();
  const unmatchedList: UnmatchedContact[] = [];

  contacts.forEach(contact => {
    const localName = `${contact.givenName || ''} ${contact.familyName || ''}`.trim() || 'Unknown';
    contact.phoneNumbers.forEach(phone => {
      const normalized = normalizePhoneNumber(phone.number, defaultRegion);
      if (normalized) {
        const hash = hashPhoneNumber(normalized);
        localMap.set(hash, localName);
        unmatchedList.push({ local_name: localName, raw_number: normalized });
      }
    });
  });

  const hashesToMatch = Array.from(localMap.keys());
  
  // Call RPC to match hashes securely
  const { data, error } = await (supabase.rpc as any)('match_contacts', {
    contact_hashes: hashesToMatch
  });

  if (error) {
    console.error('Contact match error:', error);
    throw error;
  }

  const matchedContacts: DiscoveredContact[] = [];
  const matchedHashes = new Set<string>();

  if (data) {
    (data as any[]).forEach((row: any) => {
      matchedHashes.add(row.matched_hash);
      matchedContacts.push({
        id: row.id,
        display_name: row.display_name,
        avatar_path: row.avatar_path,
        phone_hash: row.matched_hash,
        local_name: localMap.get(row.matched_hash) || row.display_name,
      });
    });
  }

  // Filter unmatched list
  const remainingUnmatched = unmatchedList.filter(u => !matchedHashes.has(hashPhoneNumber(u.raw_number)));
  
  // Deduplicate unmatched by raw_number
  const uniqueUnmatched = Array.from(new Map(remainingUnmatched.map(item => [item.raw_number, item])).values());

  return {
    matched: matchedContacts,
    unmatched: uniqueUnmatched
  };
};

export const searchGlobalUsers = async (query: string, currentUserId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_path')
    .ilike('display_name', `%${query}%`)
    .neq('id', currentUserId)
    .limit(20);

  if (error) {
    console.error('Global search error:', error);
    return [];
  }
  return data || [];
};

export const getSuggestedUsers = async (currentUserId: string) => {
  // Fetch some recent or random users as a placeholder for suggestions
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_path')
    .neq('id', currentUserId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Fetch suggested users error:', error);
    return [];
  }
  return data || [];
};
