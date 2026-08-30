# Contact Discovery Security & Threat Model

This document outlines the architecture, privacy constraints, and inherent threat models of VEIL's Contact Discovery feature.

## Architecture

To allow users to find their friends on VEIL without leaking their entire address book to the server, we use a localized hashing strategy.

1. **Local Normalization:** The client reads the raw phone number from the device and normalizes it to the international E.164 format (e.g., `+14155552671`) using `google-libphonenumber`.
2. **Local Hashing:** The client performs a fast, native SHA-256 hash on the normalized string using `react-native-quick-crypto`.
3. **RPC Matching:** The client sends an array of hashes to the server via the `match_contacts` RPC. The server returns the UUID and display name of any `public.profiles` that have a matching `phone_hash`.

## Privacy Guarantees
- Raw phone numbers **never** leave the user's device.
- The server database (`public.profiles`) stores only the SHA-256 hash of a user's phone number, never the raw digits.
- Supabase edge logs will only ever see cryptographic hashes traversing the network.

## Threat Model: Limitations of Phone Number Hashing

> [!WARNING]
> **Rainbow Table Vulnerability**
> Phone numbers possess inherently low entropy. For a given region, there are typically less than 10 billion valid combinations. A standard desktop GPU can compute SHA-256 hashes for all 10 billion possible numbers in a matter of seconds.

**Implications:**
- If the server database is compromised, an attacker can easily execute a dictionary attack (rainbow table) to reverse the hashes and discover the raw phone numbers of registered VEIL users.
- Furthermore, an attacker can reverse the hashes sent during a discovery request to reconstruct the user's address book.

**Why not use a Salt?**
- A global server-side salt does not prevent an attacker who compromises the database from regenerating the rainbow table.
- A per-user salt requires the client to request the salt for every possible phone number in the world before hashing, which is impossible.

## Mitigations and Alternatives

Standard mainstream apps like Signal solve this using **Intel SGX (Software Guard Extensions)**. SGX creates a Secure Enclave in the processor where the raw address book is uploaded, checked against registered numbers inside the enclave, and immediately destroyed. The enclave guarantees that even the server administrator cannot read the memory space.

Since VEIL is built on standard PostgreSQL (Supabase), SGX is unavailable. 

For Stage 4, we accept this baseline threat model as it satisfies the requirement of "not storing raw phone numbers" natively in the database while remaining highly performant. If extreme privacy is required in the future without SGX, VEIL would need to investigate complex **Private Set Intersection (PSI)** protocols, which carry significant performance overhead for mobile clients.
