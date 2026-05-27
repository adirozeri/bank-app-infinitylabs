```mermaid
sequenceDiagram
  participant User
  participant Frontend
  participant Backend

  User->>Frontend: fills email and password
  Frontend->>Backend: POST /api/auth/login
  Backend->>Backend: validate credentials
  Backend-->>Frontend: 200 OK + JWT token
  Frontend->>Frontend: redirect to dashboard
  ```