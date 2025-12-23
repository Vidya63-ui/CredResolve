## Expense Sharing Application (Engineering Design)

This project is a simplified Splitwise-style expense sharing system implemented in the **MERN stack** with an **MVC-style backend**, **JWT-based authentication/authorization**, and an **interactive React UI**.

### High-Level Architecture

- **Backend (Node + Express + MongoDB + Mongoose)**
  - Entry point: `backend/src/server.js`
  - Layering:
    - **Routes** (`src/routes`) – HTTP endpoints and validation
    - **Controllers** (`src/controllers`) – request handling and orchestration
    - **Models** (`src/models`) – MongoDB collections and schemas
    - **Middleware** (`src/middleware`) – auth (JWT)
    - **Utils** (`src/utils`) – balance calculation and debt simplification
- **Frontend (React + Vite)**
  - Entry: `frontend/src/main.jsx`, `frontend/src/App.jsx`
  - Pages:
    - `LoginPage` – registration + login
    - `GroupsPage` – list/create groups
    - `GroupDetailPage` – add expenses, view balances, settle dues

The frontend talks to the backend via `/api/*` routes, proxied by Vite (`frontend/vite.config.mts`) to `http://localhost:5000`.

### Core Features vs Requirements

- **Create groups**
  - API: `POST /api/groups` – create group with a name; creator is automatically a member.
  - API: `GET /api/groups` – list all groups where the current user is a member.
- **Add shared expenses**
  - API: `POST /api/expenses`
  - Fields: `groupId`, `description`, `amount`, `splitType` (`EQUAL | EXACT | PERCENT`), `participants`.
  - Validation and split logic:
    - **EQUAL** – amount is divided equally among all participant user IDs.
    - **EXACT** – caller passes `{ userId, amount }[]`; controller verifies that the sum of `amount` equals the total.
    - **PERCENT** – caller passes `{ userId, percent }[]`; controller verifies that the sum of `percent` is 100, and converts to concrete amounts.
- **Track balances & who owes whom**
  - Models:
    - `Expense` – who paid, how much, and each participant’s share.
    - `Settlement` – explicit settle-up payments between users.
  - `computeNetBalances(expenses, settlements)` (`src/utils/balanceUtils.js`):
    - For each expense:
      - The payer’s balance increases by each participant’s share.
      - Each participant’s balance decreases by their share.
    - For each settlement:
      - When user A pays user B amount X, A’s net balance increases by X, B’s decreases by X.
    - Net balance convention: **positive = others owe this user**, negative = **user owes others**.
  - `simplifyDebts(balances)`:
    - Splits users into **creditors** (positive balance) and **debtors** (negative).
    - Greedy algorithm that matches debtors to creditors to generate minimal “A owes B X” edges.
  - API: `GET /api/expenses/:groupId/balances`
    - Returns:
      - `members` – group members (id, name, email).
      - `balances` – raw net balance map `{ userId: amount }`.
      - `simplified` – simplified list of edges `{ from, to, amount }`.
- **Settle dues**
  - Model: `Settlement` records a payment in a group between two users.
  - API: `POST /api/expenses/:groupId/settle` – from the current user to `toUserId` for `amount`.
  - These settlements are included when computing balances, so balances reflect historical expenses minus any settle-up operations.

### Authentication & Authorization

- **Authentication**
  - `POST /api/auth/register` – create account with `name`, `email`, `password` (hashed with bcrypt).
  - `POST /api/auth/login` – returns a JWT token and basic user info.
  - JWT payload: `{ userId }`, signed with `JWT_SECRET`, 7-day expiry.
- **Authorization**
  - `authRequired` middleware (`src/middleware/authMiddleware.js`):
    - Reads `Authorization: Bearer <token>` header.
    - Verifies JWT and loads the user.
    - Attaches `req.user = { id, name, email }`.
  - Group and expense operations enforce membership:
    - Create/read groups limited to authenticated users.
    - Adding expenses and viewing balances checks that the user belongs to the target group.

### Data Model Overview

- **User**
  - `name: string`
  - `email: string` (unique)
  - `passwordHash: string`
- **Group**
  - `name: string`
  - `createdBy: ObjectId<User>`
  - `members: ObjectId<User>[]`
- **Expense**
  - `description: string`
  - `amount: number`
  - `splitType: "EQUAL" | "EXACT" | "PERCENT"`
  - `group: ObjectId<Group>`
  - `paidBy: ObjectId<User>`
  - `splits: { user: ObjectId<User>, amount: number, percent?: number }[]`
- **Settlement**
  - `group: ObjectId<Group>`
  - `from: ObjectId<User>`
  - `to: ObjectId<User>`
  - `amount: number`

### Frontend UX Highlights

- **Login / Register**
  - Single card that can switch between “Login” and “Create account”.
  - On successful login, token and user info stored in `localStorage` and React state.
- **Groups**
  - Clean two-column layout:
    - Left: List of user’s groups, each with member count and “Open” button.
    - Right: Form to create a new group.
- **Group Details**
  - Summary panel for the current user:
    - “You owe” and “You are owed” computed from simplified balances.
  - List of simplified debts in human-readable form (e.g. `Alice owes Bob ₹ 250.00`).
  - **Add Expense**
    - Form for description, amount, and split type (Equal / Exact / Percent).
    - For simplicity in the demo UI, all members are included equally; the backend still supports proper EXACT/PERCENT payloads if extended.
  - **Settle Dues**
    - Choose another member and an amount to record a settlement, which updates balances.

### How to Run (Locally)

1. **Backend**
   - `cd backend`
   - Create `.env`:
     - `MONGO_URI=mongodb://localhost:27017/expense_sharing`
     
     - `JWT_SECRET=some-strong-secret`
   - Install & run:
     - `npm install`
     - `npm run dev`
2. **Frontend**
   - `cd frontend`
   - `npm install`
   - `npm run dev`
   - Open the URL printed by Vite (usually `http://localhost:3000`).

This design demonstrates MVC separation on the backend, proper auth and access control, three split strategies (equal/exact/percent), balance simplification (who owes whom), and an interactive, modern UI that lets each user see **how much they owe, how much others owe them, and settle dues**.


