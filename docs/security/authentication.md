# Authentication Model

This document outlines the authentication and Multi-Factor Authentication (MFA) architecture for VEIL.

## Session Model
- We rely on `@supabase/supabase-js` combined with `react-native-encrypted-storage` to persist the JWT session across app restarts securely.
- `AuthContext.tsx` handles restoring the session on boot and providing it to the component tree.
- When `session` is null, the `AuthNavigator` renders.

## MFA Model
- TOTP MFA is an optional feature but is heavily supported by the application stack.
- The user's AAL (Authenticator Assurance Level) dictates their access to the application via `RootNavigator`.
- If a user is enrolled in MFA (`nextAal === 'aal2'`) but only currently authenticated via password (`aal === 'aal1'`), they are routed to an interstitial `MfaChallengeScreen` before the main application is rendered.
- **QR Code setup** is built directly into the client via `react-native-qrcode-svg`.

## Database Profile Strategy
- A Supabase Database Trigger (`public.handle_new_user()`) intercepts new user registrations on the server.
- The trigger seamlessly generates a row in `public.profiles`. This is resilient to network drops and protects against duplicate profile creation.
- The `display_name` is passed as `raw_user_meta_data` during sign-up to pre-fill the profile.

## Future Mandatory MFA 
- By design, MFA is optional today.
- If mandatory MFA is ever required, we can enforce it server-side by adding `AND auth.jwt() ->> 'aal' = 'aal2'` to the Row Level Security (RLS) policies of all protected tables.
- This would forcefully reject any database queries from users who bypassed the client-side challenge.
