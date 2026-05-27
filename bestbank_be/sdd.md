# Software Design Description
## For Web Banking Application — Backend

Version 1.0  
Web Banking Project  
April 2026

## Table of Contents
<!-- TOC -->
* [1. Introduction](#1-introduction)
  * [1.1 Document Purpose](#11-document-purpose)
  * [1.2 Subject Scope](#12-subject-scope)
  * [1.3 Definitions, Acronyms, and Abbreviations](#13-definitions-acronyms-and-abbreviations)

* [2. Design Overview](#2-design-overview)
    * [2.2 API Design](#22-api-design)
        * [2.2.1 Authentication](#221-authentication)
        * [2.2.2 Endpoint Summary](#222-endpoint-summary)
    
* [3. Design Views](#3-design-views)
  * [3.1 Context View](#31-context-view)
  * [3.2 API View](#32-api-view)
  * [3.3 Interaction View](#33-interaction-view)



<!-- TOC -->

---

## 1. Introduction

### 1.1 Document Purpose

This Software Design Description (SDD) documents the architectural and detailed design of the backend server for the Web Banking Application. It serves as the single source of truth for anyone building, reviewing, or extending the system. The intended audiences are:

- **Developers** who implement or maintain any part of the backend codebase
- **Reviewers** who need to understand design decisions and their rationale
- **Testers** who need to understand the expected behaviour of each component

### 1.2 Subject Scope

The backend is a RESTful HTTP API server built with Node.js and Express. It is responsible for:

- Registering user accounts and delivering OTP verification codes by email
- Authenticating users and issuing JSON Web Tokens (JWT)
- Serving authenticated users their account balance and transaction history
- Processing money transfers between registered accounts

### 1.3 Definitions, Acronyms, and Abbreviations

| Term       | Definition |
|------------|------------|
| API        | Application Programming Interface — a set of definitions and protocols for building and integrating application software |
| CORS       | Cross-Origin Resource Sharing — a browser mechanism that controls which origins may call an API |
| HTTP       | Hypertext Transfer Protocol — the communication protocol used between the client and server |
| JWT        | JSON Web Token — a compact, self-contained token used to represent an authenticated identity |
| OTP        | One-Time Password — a short-lived numeric code sent to the user to verify their identity |
| REST       | Representational State Transfer — an architectural style for stateless HTTP APIs |
| SDD        | Software Design Document — a document describing the intended design of a software system |
| SMTP       | Simple Mail Transfer Protocol — the protocol used to send email messages |


---

## 2. Design Overview

Bank FS follows a client-server web architecture. The React frontend owns browser routing, forms, dashboard presentation, local authentication state, and calls to the backend API. The Express backend owns validation, authentication, password hashing, verification-code handling, business rules, MongoDB persistence, and integration with email or SMS providers. MongoDB stores users, account state, verification state, and transaction records.


```
┌─────────────────────────────────────┐
│         Browser (React client)      │
└──────────────┬──────────────────────┘
               │  HTTP REST (JSON)
┌──────────────▼──────────────────────┐
│        Node.js / Express Server     │
│    http://localhost:3000/api        │
└──────┬─────────────────────────┬────┘
       │                         │    
┌──────▼──────────┐     ┌────────▼────────┐
│  MongoDB        │     │  SMTP Provider/ │
│  ( Mongoose )   │     │  Twilio         │
└─────────────────┘     │  OTP delivery   │
                        └─────────────────┘
```
### 2.1 API Design

### 2.1.1 Authentication

All protected endpoints require the following header:

```
Authorization: Bearer <JWT token>
```

The JWT payload contains only:

```json
{ "userId": "64a1b2c3d4e5f64840abcdef", "iat": 1414000000, "exp": 1414086400 }
```

No user data (balance, email, role) is stored in the token. All user data is fetched fresh from the database on every request using the `userId` as the lookup key.

### 2.1.2 Endpoint Summary

| Method | Path | Auth | Purpose |
|--------|------|------|------------|
| POST | `/api/auth/register` | No | Create an unverified user, generate a verification code, and send it.|
| POST | `/api/auth/verify` | No | Validate the six-digit OTP and mark the user as verified. |
| POST | `/api/auth/login` | No | Authenticate email and password, then return a JWT. |
| GET | `/api/accounts/me` | Yes | Return current user balance and recent transactions. |
| POST | `/api/transactions` | Yes | Transfer money from the authenticated user to another registered user. |

**Request / response contracts (summary):**

`POST /api/auth/register`
- Body: `{ email, password, phone }`
- 201: `{ message: "OTP sent to <email>" }`
- 400: invalid format or missing field
- 409: email already registered

`POST /api/auth/verify`
- Body: `{ email, otp }`
- 200: `{ token, user: { id, email, balance } }`
- 400: incorrect or expired OTP
- 404: no pending registration for this email

`POST /api/auth/login`
- Body: `{ email, password }`
- 200: `{ token, user: { id, email, balance } }`
- 401: wrong credentials
- 403: account not verified

`GET /api/accounts/me`
- Header: Bearer token required
- 200: `{ balance, transactions: [{ id, counterpartyEmail, amount, date }] }`
- 401: unauthorized

`POST /api/transactions`
- Header: Bearer token required
- Body: `{ recipientEmail, amount }`
- 201: `{ message, newBalance, transaction: { id, counterpartyEmail, amount, date } }`
- 400: insufficient balance, invalid amount, or self-transfer
- 401: unauthorized
- 404: recipient not found


---

## 3. Design Views

### 3.1 Context View
Purpose: Depicts the system's relationship to its environment and external entities, showing boundaries and services provided.

![BankDesign](BankDesign.png)

Flow:
Bank Customers
 → use the Browser Application
 → to register, verify their account, log in, view their dashboard, and transfer money
 → the Browser Application sends requests to the Express API
 → the Express API validates requests, enforces authentication, and handles sensitive operations
 → the Express API persists state in MongoDB
*  The browser does not access the database directly.
* The browser does not access provider credentials directly.
* All sensitive operations must pass through the Express API.


### 3.2 API View

The full API surface is five endpoints. All responses use `Content-Type: application/json`. All error responses share the shape `{ "message": "<human-readable reason>" }`.

See section 2.1 for the complete interface specification.


### 3.3 Interaction View

Sequence diagram detailing the endpoints intersections.

#### 3.3.1 Interaction View: Registration and Verification
![BankRegistration](BankRegistration.png)


#### 3.3.2 Interaction View: Verification
![BankVerification](BankVerification.png)


#### 3.3.3 Interaction View: Login
![BankLogin](BankLogin.png)


#### 3.3.4 Interaction View: Dashboard
![BankDashboard](BankDashboard.png)


#### 3.3.5 Interaction View: Transfer
![BankTransfer](BankTransfer.png)


---