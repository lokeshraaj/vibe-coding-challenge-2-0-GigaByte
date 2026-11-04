# ATHLIX — Multi-Tenant Sports Academy Management & Scouting SaaS

> **A scalable, production-ready B2B SaaS platform engineered for sports academies worldwide to digitize coaching operations, lock practice attendance, record match performance, and mathematically discover trial-ready athletes for professional scouting.**

---

## 1. Product Overview & Architecture

Athlix is designed from first principles with **shared-database, shared-collection multi-tenancy** powered by MongoDB Atlas. Every tenant (academy) operates in strict isolation, with role-based and coach-level scoping enforced on every protected operation.

### Key Architectural Invariants
1. **Multi-Tenant Isolation**: Zero cross-tenant data leakage. All tenant queries are scoped by `academyId`, verified exclusively from server-side JWT session cookies.
2. **Coach Squad Boundary**: Coaches can access only their assigned player rosters and training sessions.
3. **Practice Session Immutability**: Practice sessions follow a strict lifecycle (`OPEN` &rarr; `CLOSED`). Closing a session verifies attendance completeness and permanently locks all records with a cryptographic timestamp and coach signature.
4. **Match Sheet Verification**: Competitive matches require a linked **closed** practice session on the same date and sport. **Absent players are strictly rejected from participating in matches.**
5. **Deterministic Scouting Radar**: Players become `READY` for professional scouting trials if and only if:
   $$\text{Attendance Rate} \ge 75\% \quad \text{AND} \quad \text{Match Appearances} \ge 2$$
   Scouts assigned to each coach have read-only access to **strictly READY athletes**. Developing players are hidden from scouts until they satisfy both requirements.

---

## 2. Technology Stack

- **Frontend**: Next.js 15+ (App Router), React 19, TypeScript (Strict Mode), Tailwind CSS, shadcn/ui design primitives, Lucide React icons.
- **Backend**: Next.js Route Handlers, Server Actions, Zod validation, Service Layer with Modular Monolith boundaries.
- **Database**: MongoDB Atlas with Mongoose ODM (compound indexes, referential integrity guards, connection pooling).
- **Authentication**: JWT Session Cookies (Web Crypto API via `jose`, HTTP-only, SameSite, Secure) + bcrypt password hashing.
- **Testing**: Vitest automated unit, integration, and end-to-end simulation test suites.
- **Visual Identity**: High-contrast, bold athletic sports editorial theme (Obsidian `#080A09`, Graphite `#151817`, Electric Lime `#A3FF00`).

---

## 3. Multi-Tenant Relational Hierarchy

```
GLOBAL PLATFORM (Super Admin)
  └── ACADEMY TENANT (Unique academyId, slug, status: ACTIVE | SUSPENDED | DEACTIVATED)
        ├── Academy Owner (Manages academy profile, invites coaches, assigns scouts)
        │
        ├── Coach 1 (Sport: Football)
        │     ├── Players (Assigned strictly to Coach 1)
        │     ├── Dedicated Scout 1 (Read-only talent radar; READY players under Coach 1 only)
        │     ├── Practice Sessions (OPEN -> CLOSED immutability lock)
        │     └── Matches (Linked to closed sessions; absent players rejected)
        │
        └── Coach 2 (Sport: Basketball)
              ├── Players (Assigned strictly to Coach 2)
              ├── Dedicated Scout 2 (Assigned to Coach 2)
              └── Sessions & Matches (Isolated from Coach 1)
```

---

## 4. Role-Based Access Control (RBAC) Matrix

| Capability / Endpoint | Platform Admin | Academy Owner | Head Coach | Dedicated Scout | Athlete Player |
|---|:---:|:---:|:---:|:---:|:---:|
| Platform Telemetry & Academy Status | ✅ | ❌ | ❌ | ❌ | ❌ |
| Invite Coaches & Assign Scouts | ✅ | ✅ | ❌ | ❌ | ❌ |
| Reassign Scouts Between Coaches | ✅ | ✅ | ❌ | ❌ | ❌ |
| Add / Manage Assigned Players | ✅ | ✅ | ✅ (Own squad) | ❌ | ❌ |
| Create & Lock Practice Sessions | ❌ | ❌ | ✅ (Own squad) | ❌ | ❌ |
| Field Match & Record Scores | ❌ | ❌ | ✅ (Own squad) | ❌ | ❌ |
| Scout Talent Radar (READY Players) | ✅ | ✅ | ✅ | ✅ (Assigned coach) | ❌ |
| View Personal Attendance & Stats | ❌ | ❌ | ❌ | ❌ | ✅ (Self only) |

---

## 5. Mathematical Eligibility Engine

The eligibility engine runs continuously from actual database records:

$$\text{Attendance \%} = \left(\frac{\text{Present Closed Sessions}}{\text{Total Closed Sessions from Enrollment}}\right) \times 100$$

$$\text{Status} = \begin{cases} \mathbf{READY} & \text{if Attendance \%} \ge 75 \text{ and Matches} \ge 2 \\ \mathbf{NOT\_READY} & \text{otherwise} \end{cases}$$

### Benchmark Test Cases
- $74\%$ Attendance $+ 3$ Matches $\implies$ `NOT_READY` (Reason: Attendance below 75% threshold).
- $75\%$ Attendance $+ 2$ Matches $\implies$ `READY` (Trial Ready!).
- $90\%$ Attendance $+ 1$ Match $\implies$ `NOT_READY` (Reason: Needs at least 2 match appearances).
- $100\%$ Attendance $+ 2$ Matches $\implies$ `READY` (Trial Ready!).

---

## 6. Local Development & Quick Start

### Prerequisites
- Node.js `v20+` or `v24+`
- MongoDB local instance or MongoDB Atlas connection URI

### 1. Clone & Install Dependencies
```bash
git clone <repo-url>
cd Athlix
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Ensure `MONGODB_URI` points to your MongoDB instance:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/athlix?retryWrites=true&w=majority
JWT_SECRET=athlix_super_secure_production_ready_jwt_secret_key_2026_xyz987654321
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Seed Development Database
Populates the database with realistic test tenants, coaches, scouts, closed sessions, and matches:
```bash
npm run seed
```

#### Pre-Configured Seed Accounts:
- **Platform Super Admin**: `superadmin@athlix.com` / `AthlixAdmin2026!`
- **Academy Owner (Apex Academy)**: `owner@apex.com` / `ApexOwner2026!`
- **Head Coach (Football)**: `coach.marcus@apex.com` / `CoachMarcus2026!`
- **Assigned Scout (Football)**: `scout.elena@apex.com` / `ScoutElena2026!`
- **Player (Trial Ready Athlete)**: `player.leo@apex.com` / `PlayerLeo2026!`
- **Independent Academy B Owner**: `owner@vanguard.com` / `VanguardOwner2026!`

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 7. Automated Test Suite

Athlix includes comprehensive automated testing:
- **Unit Tests**: Eligibility calculation formulas, edge cases (zero sessions, boundary conditions), JWT verification, and tampering protection.
- **Integration Tests**: Business rules invariants, session completeness validation, and absent player rejection from match sheets.
- **End-to-End Tests**: Complete 15-step simulation from Academy registration to coach assignment, session locking, match scorekeeping, scout discovery, and player self-service access.

Run all tests:
```bash
npm test
```

---

## 8. Production Deployment Guide (Vercel & MongoDB Atlas)

### 1. MongoDB Atlas Setup
1. Create a free or dedicated cluster on MongoDB Atlas.
2. In Network Access, add `0.0.0.0/0` (or Vercel IP ranges) to the IP Whitelist.
3. In Database Access, create a database user with read/write privileges.
4. Copy the connection string (e.g. `mongodb+srv://<user>:<password>@cluster0.mongodb.net/athlix?retryWrites=true&w=majority`).

### 2. Vercel Deployment
1. Push this repository to GitHub.
2. Import the repository into your Vercel Dashboard.
3. Configure the following Environment Variables in Vercel:
   - `MONGODB_URI`: Your MongoDB Atlas connection string.
   - `JWT_SECRET`: A secure 32+ character random secret string.
   - `NEXT_PUBLIC_APP_URL`: Your Vercel production domain (e.g. `https://athlix.vercel.app`).
4. Click **Deploy**. Vercel will build the production bundle (`next build`) and provision edge and serverless route handlers.
