# BankingApp Policy Document

## 1. Registration Policy

- All fields are required: `email`, `password`, `phone`
- Email must be unique among verified users
- If a user registers with an email that is already registered and verified → rejected with "Email already registered"
- If a user registers with an email that exists but is not yet verified and the OTP window is still active → rejected with "User not verified yet. Check mail for verification." (no new code sent)
- If a user registers with an email that exists but is not yet verified and the OTP window has expired → a new OTP is generated and sent, response: "Verification time expired. New verification sent."
- On successful registration a random starting balance between 1,000 and 9,999 is assigned

## 2. OTP Verification Policy

- Every new registration generates a 6-digit numeric OTP
- OTPs are stored in a separate `otps` collection (not on the user document), with one record per email
- Each OTP record contains: `email`, `otp`, `createdAt`, `expiresAt`
- On successful verification the OTP record is deleted from the collection
- The OTP is sent to the user's email as a clickable verification link
- The OTP expiry window is configurable via `OTP_EXPIRY_MINUTES` in `.env` (default: 10 minutes)
- If the user attempts to verify after the window has expired → a new OTP is generated and sent, response: "Verification expired. New verification sent."
- If the user provides an incorrect OTP → rejected with "Incorrect OTP"
- On successful verification the OTP is cleared and the account is marked as verified
- Verification can be done via:
  - `GET /api/auth/verify?email=...&otp=...` (email link)
  - `POST /api/auth/verify-otp` with `{ email, otp }` in body

## 3. Authentication Policy

- Users must verify their account before they can log in
- Authentication uses JWT tokens signed with a secret key
- Tokens have no expiration (stateless, no server-side session)
- The `Authorization` header must use the `Bearer <token>` format
- Logout is client-side only (token is not invalidated server-side)

## 4. Password Policy

- Passwords are hashed using bcrypt with 10 salt rounds before storage
- Plain-text passwords are never stored or logged

## 5. Transfer Policy

- Both sender and receiver must exist in the system
- The sender must have sufficient balance to cover the transfer amount
- Transfers are recorded in the transaction history with a timestamp
- The transaction log shows the counterpart email and a signed amount (negative for sent, positive for received)

## 6. Account Deletion Policy

- `DELETE /api/account/me` — hard-deletes the authenticated user's account (requires JWT)
- `DELETE /api/auth/debug-delete/:email` — hard-deletes by email with no authentication (debug only, to be removed before production)
- Deletion is permanent with no soft-delete or recovery mechanism (a soft-delete "remove user" feature is planned)

## 7. Debug Endpoints Policy (Development Only)

- `GET /api/auth/debug-otp/:email` — returns the current OTP for a user in plain text
- `POST /api/auth/debug-expire-otp/:email` — sets the OTP expiry to the past to simulate expiration (used in test suites)
- `DELETE /api/auth/debug-delete/:email` — deletes a user by email without authentication
- These endpoints must be removed or protected before any production deployment
