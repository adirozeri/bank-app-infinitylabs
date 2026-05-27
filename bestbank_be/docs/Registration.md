```mermaid
sequenceDiagram
  participant User
  participant Frontend
  participant Backend

  User->>Frontend: fills email, password, phone
  Frontend->>Backend: POST /api/auth/register
  Backend->>Backend: validate input, check email unique
  Backend->>User: sends OTP via SMS or email
  Backend-->>Frontend: 201 Created
  User->>Frontend: enters OTP
  Frontend->>Backend: POST /api/auth/verify-otp
  Backend-->>Frontend: 200 OK + JWT token
  Frontend->>Frontend: redirect to dashboard
  ```