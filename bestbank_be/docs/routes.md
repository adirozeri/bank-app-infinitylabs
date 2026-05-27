# BankingApp API Routes

## Auth Routes — `/api/auth`

### `POST /api/auth/register`
Registers a new user and sends a verification email.

- **Auth required:** No
- **Body:** `{ email, password, phone }`
- **Responses:**
  - `201` — User created, verification email sent
  - `400` — Missing fields
  - `400` — Email already registered (verified user)
  - `400` — User not verified yet. Check mail for verification. (window still active)
  - `400` — Verification time expired. New verification sent. (window expired, new OTP sent)

---

### `GET /api/auth/verify`
Verifies a user's account via the link sent in the email.

- **Auth required:** No
- **Query params:** `email`, `otp`
- **Responses:**
  - `200` — Account verified successfully, returns `{ token }`
  - `400` — Incorrect OTP
  - `400` — Verification expired. New verification sent. (new OTP sent)
  - `404` — User not found

---

### `POST /api/auth/verify-otp`
Verifies a user's account via body (Postman / programmatic use).

- **Auth required:** No
- **Body:** `{ email, otp }`
- **Responses:**
  - `200` — Returns `{ token }`
  - `400` — Incorrect OTP
  - `400` — Verification expired. New verification sent. (new OTP sent)
  - `404` — User not found

---

### `POST /api/auth/login`
Logs in a verified user and returns a JWT token.

- **Auth required:** No
- **Body:** `{ email, password }`
- **Responses:**
  - `200` — Returns `{ token }`
  - `401` — Invalid email or password
  - `403` — Please verify your account first

---

### `POST /api/auth/logout`
Logs out the user (client-side only, token is not invalidated server-side).

- **Auth required:** No
- **Responses:**
  - `200` — Logged out successfully

---

## Account Routes — `/api/account`

### `GET /api/account/me`
Returns the authenticated user's profile.

- **Auth required:** Yes (Bearer token)
- **Responses:**
  - `200` — Returns `{ email, phone, balance }`
  - `404` — User not found

---

### `DELETE /api/account/me`
Hard-deletes the authenticated user's account.

- **Auth required:** Yes (Bearer token)
- **Responses:**
  - `200` — User deleted successfully
  - `404` — User not found

---

## Transaction Routes — `/api/transactions`

### `GET /api/transactions`
Returns the authenticated user's transaction history.

- **Auth required:** Yes (Bearer token)
- **Responses:**
  - `200` — Returns `{ transactions: [{ counterpartEmail, amount, timestamp }] }`
    - `amount` is negative for sent, positive for received

---

### `POST /api/transactions`
Transfers money from the authenticated user to another user.

- **Auth required:** Yes (Bearer token)
- **Body:** `{ receiverEmail, amount }`
- **Responses:**
  - `200` — Transfer successful, returns `{ message, senderBalance }`
  - `400` — Missing fields
  - `400` — Receiver not found
  - `400` — Insufficient balance

---

## Debug Routes — `/api/auth` (Development Only)

> These routes must be removed or protected before production deployment.

### `GET /api/auth/debug-otp/:email`
Returns the current OTP for a user.

- **Auth required:** No
- **Responses:**
  - `200` — Returns `{ otp }`
  - `404` — OTP not found

---

### `POST /api/auth/debug-expire-otp/:email`
Forces the user's OTP to expire immediately (used in test suites).

- **Auth required:** No
- **Responses:**
  - `200` — OTP expired successfully
  - `404` — OTP not found

---

### `DELETE /api/auth/debug-delete/:email`
Hard-deletes a user by email with no authentication (also deletes their OTP record).

- **Auth required:** No
- **Responses:**
  - `200` — User deleted successfully
  - `404` — User not found
