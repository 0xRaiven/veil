import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env from mobile/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing SUPABASE env vars in mobile/.env");
  process.exit(1);
}

const aliceClient = createClient(supabaseUrl, supabaseAnonKey);
const bobClient = createClient(supabaseUrl, supabaseAnonKey);
const eveClient = createClient(supabaseUrl, supabaseAnonKey);

async function runTests() {
  console.log('--- VEIL RLS INTEGRATION TESTS ---');

  // 1. Sign Up test users
  const aliceEmail = `alice_${Date.now()}@test.com`;
  const bobEmail = `bob_${Date.now()}@test.com`;
  const eveEmail = `eve_${Date.now()}@test.com`;

  const { data: aliceAuth } = await aliceClient.auth.signUp({ email: aliceEmail, password: 'password123' });
  const { data: bobAuth } = await bobClient.auth.signUp({ email: bobEmail, password: 'password123' });
  const { data: eveAuth } = await eveClient.auth.signUp({ email: eveEmail, password: 'password123' });

  const aliceId = aliceAuth.user?.id!;
  const bobId = bobAuth.user?.id!;
  const eveId = eveAuth.user?.id!;

  console.log(`Created Alice (${aliceId}), Bob (${bobId}), Eve (${eveId})`);

  // 2. Alice creates a conversation with Bob
  // We generate the UUID client-side because .select() will fail RLS (Alice isn't a member yet!)
  const convId = crypto.randomUUID();
  const { error: convErr } = await aliceClient.from('conversations').insert({ id: convId, type: 'direct' });
  if (convErr) throw new Error("Alice failed to create conversation: " + convErr.message);

  await aliceClient.from('conversation_members').insert([
    { conversation_id: convId, user_id: aliceId, role: 'member' },
    { conversation_id: convId, user_id: bobId, role: 'member' }
  ]);
  console.log(`PASS: Alice created conversation ${convId} with Bob`);

  // 3. Alice inserts a message
  const { error: msgErr } = await aliceClient.from('messages').insert({
    conversation_id: convId,
    sender_id: aliceId,
    content_type: 'plaintext',
    content: 'Hello Bob!'
  });
  if (msgErr) throw new Error("Alice failed to send valid message: " + msgErr.message);
  console.log(`PASS: Alice sent message to Bob successfully.`);

  // 4. IMPERSONATION TEST: Alice tries to send a message as Bob
  const { error: impErr } = await aliceClient.from('messages').insert({
    conversation_id: convId,
    sender_id: bobId,
    content_type: 'plaintext',
    content: 'I am totally Bob'
  });
  if (impErr) {
    console.log(`PASS: Impersonation prevented (Alice acting as Bob blocked)`);
  } else {
    throw new Error("FAIL: Impersonation was allowed!");
  }

  // 5. UNAUTHORIZED READ TEST: Eve tries to read Alice & Bob's messages
  const { data: eveRead, error: eveReadErr } = await eveClient.from('messages').select('*').eq('conversation_id', convId);
  if (!eveReadErr && eveRead && eveRead.length > 0) {
    throw new Error("FAIL: Eve was able to read Alice & Bob's conversation!");
  } else {
    console.log(`PASS: Unauthorized read prevented (Eve sees 0 messages)`);
  }

  // 6. UNAUTHORIZED WRITE TEST: Eve tries to send a message to Alice & Bob
  const { error: eveWriteErr } = await eveClient.from('messages').insert({
    conversation_id: convId,
    sender_id: eveId,
    content_type: 'plaintext',
    content: 'I am a hacker'
  });
  if (eveWriteErr) {
    console.log(`PASS: Unauthorized write prevented (Eve cannot insert into conversation)`);
  } else {
    throw new Error("FAIL: Eve successfully wrote to Alice & Bob's conversation!");
  }

  console.log('\n✅ ALL RLS TESTS PASSED.');
}

runTests().catch(e => {
  console.error('\n❌ TEST FAILED:', e);
  process.exit(1);
});
