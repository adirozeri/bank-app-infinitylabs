```mermaid
sequenceDiagram
  participant Sender
  participant Frontend
  participant Backend
  participant Receiver

  Sender->>Frontend: fills receiver email and amount
  Frontend->>Backend: POST /api/transactions
  Backend->>Backend: check sender balance
  Backend->>Backend: check receiver exists
  Backend->>Backend: deduct from sender, credit receiver
  Backend-->>Frontend: 200 OK + both transaction records
  Frontend->>Sender: shows deducted amount with minus sign
  Backend-->>Receiver: real-time notification via Socket.IO
  ```