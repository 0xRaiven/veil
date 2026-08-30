// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// This edge function uses the REST API for Firebase Cloud Messaging (HTTP v1)
// It does NOT use a service account key directly in the code, but reads it from the environment.
// For simplicity in Deno, we construct the JWT token or we can use a library.
// A simpler approach for Deno is to use the Google Auth Library if needed,
// but to avoid massive dependencies, many use a lightweight JWT signer or 
// deploy with standard Firebase Admin SDK (which is Node-based).
// Since Supabase Edge Functions support npm modules now, we can use firebase-admin!

import { initializeApp, cert } from 'npm:firebase-admin/app';
import { getMessaging } from 'npm:firebase-admin/messaging';

// Initialize Firebase Admin (lazy load to avoid errors if env not set during build)
let initialized = false;

function initFirebase() {
  if (initialized) return;
  const serviceAccountStr = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
  if (!serviceAccountStr) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set.');
  }
  
  try {
    const serviceAccount = JSON.parse(serviceAccountStr);
    initializeApp({
      credential: cert(serviceAccount),
    });
    initialized = true;
  } catch (error) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT', error);
    throw error;
  }
}

serve(async (req) => {
  try {
    initFirebase();
    
    // Create a Supabase client to query the push_tokens table
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // This webhook is triggered by an INSERT into the messages table
    const payload = await req.json();
    const record = payload.record; // The new message row

    if (!record || !record.conversation_id || !record.sender_id) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
    }

    // 1. Get the members of the conversation
    const { data: members, error: membersError } = await supabaseClient
      .from('conversation_members')
      .select('user_id')
      .eq('conversation_id', record.conversation_id)
      .neq('user_id', record.sender_id); // Don't notify the sender

    if (membersError || !members || members.length === 0) {
      return new Response(JSON.stringify({ message: 'No recipients found' }), { status: 200 });
    }

    const recipientIds = members.map(m => m.user_id);

    // 2. Fetch push tokens for recipients who have push_enabled = true
    // In a real app, this might be a join, but let's query profiles first
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, push_enabled, display_name')
      .in('id', recipientIds);

    const enabledUserIds = profiles?.filter(p => p.push_enabled !== false).map(p => p.id) || [];
    
    if (enabledUserIds.length === 0) {
      return new Response(JSON.stringify({ message: 'No users have push enabled' }), { status: 200 });
    }

    // Get the sender's name
    const { data: senderProfile } = await supabaseClient
      .from('profiles')
      .select('display_name')
      .eq('id', record.sender_id)
      .single();
      
    const senderName = senderProfile?.display_name || 'Someone';

    // 3. Get the push tokens
    const { data: tokens, error: tokensError } = await supabaseClient
      .from('push_tokens')
      .select('token')
      .in('user_id', enabledUserIds);

    if (tokensError || !tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ message: 'No tokens found' }), { status: 200 });
    }

    const fcmTokens = tokens.map(t => t.token);
    
    const messageContent = record.content_type === 'plaintext' 
      ? record.content 
      : 'Sent an attachment';

    // 4. Send the notification via Firebase Admin
    const message = {
      notification: {
        title: senderName,
        body: messageContent,
      },
      data: {
        conversationId: record.conversation_id,
        type: 'new_message',
      },
      tokens: fcmTokens,
    };

    const response = await getMessaging().sendEachForMulticast(message);
    
    console.log('Successfully sent message:', response.successCount, 'failed:', response.failureCount);
    
    return new Response(
      JSON.stringify({ success: true, response }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('Error in send-message-push:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
