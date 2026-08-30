# Supabase Foundation

This directory contains details about our Supabase integration for the VEIL application.

## Project Structure
- `mobile/src/services/supabase/client.ts`: The singleton Supabase client configured for React Native.
- `mobile/src/types/database.ts`: TypeScript definitions matching the database schema.
- `supabase/migrations/`: Contains the SQL migration files for the Supabase backend. 

## Environment Configuration
VEIL requires `.env` in the `mobile/` directory:
- `SUPABASE_URL`: The project URL.
- `SUPABASE_ANON_KEY`: The public anon key.

## Security & Storage
We use `react-native-encrypted-storage` to ensure that Supabase session tokens (JWTs) are stored in the Android hardware keystore, rather than plain text `AsyncStorage`. This fulfills the security requirement that credentials must be protected locally.

## Row Level Security (RLS) Philosophy
VEIL strictly adheres to Row Level Security.
- `profiles`: Users may only SELECT, INSERT, and UPDATE their *own* profile (`auth.uid() = id`). 
- There is no "global read" permission granted to authenticated users unless strictly necessary for future contact discovery (which will be implemented safely).

## Migration Strategy
1. Never modify an existing migration.
2. Create new SQL files in `supabase/migrations/` prefixed with the current timestamp.
3. Test locally using `supabase db reset` before pushing.
