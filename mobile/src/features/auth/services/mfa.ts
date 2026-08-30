import { supabase } from '../../../services/supabase/client';

export const enrollTOTP = async () => {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
  });
  if (error) throw error;
  return data;
};

export const verifyTOTP = async (factorId: string, code: string) => {
  const { data, error } = await supabase.auth.mfa.challenge({ factorId });
  if (error) throw error;
  
  const challengeId = data.id;
  const verifyResponse = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code,
  });
  
  if (verifyResponse.error) throw verifyResponse.error;
  return verifyResponse.data;
};

export const challengeTOTP = async (factorId: string, code: string) => {
  const { data, error } = await supabase.auth.mfa.challenge({ factorId });
  if (error) throw error;

  const verifyResponse = await supabase.auth.mfa.verify({
    factorId,
    challengeId: data.id,
    code,
  });

  if (verifyResponse.error) throw verifyResponse.error;
  return verifyResponse.data;
};

export const unenrollTOTP = async (factorId: string) => {
  const { data, error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
  return data;
};

export const getEnrolledFactors = async () => {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  // Return only verified TOTP factors
  return data.totp.filter((factor) => factor.status === 'verified');
};
