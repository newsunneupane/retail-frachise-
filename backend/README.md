# Retail Store — Backend (Express + Prisma)

Architecture: **Next.js → Express → Prisma → Postgres (Supabase)**

Important: Prisma connects to Postgres directly with full privileges, so it
**bypasses every RLS policy** set up on the Supabase side. This backend
re-implements that access control in middleware instead — see `authenticate`
and `requireRole` in `server.js`. Any new route that touches user- or
staff-scoped data needs to use them; there's no database-level backstop here.

## Setup

1. Get your database password:
   Supabase Dashboard → your project → Project Settings → Database →
   Connection string → copy the password (or reset it if you don't have it).

2. Copy the env template and fill in the password:
   ```bash
   cp .env.example .env
   ```
   Edit `DATABASE_URL` in `.env` with your real password.

3. Install dependencies:
   ```bash
   npm install
   ```

4. Generate the Prisma client (talks to `binaries.prisma.sh` to download the
   query engine — needs normal internet access):
   ```bash
   npx prisma generate
   ```

5. Start the dev server:
   ```bash
   npm run dev
   ```
   API runs on http://localhost:4000. Check http://localhost:4000/api/health.

## How auth works here

- The Next.js frontend authenticates users via **Supabase Auth** and gets a
  JWT back.
- The frontend sends that JWT as `Authorization: Bearer <token>` on requests
  to this API.
- `authenticate` middleware verifies the token against Supabase, then looks
  up the user's `role` in the `profiles` table via Prisma and attaches it to
  `req.user`.
- `requireRole('admin', 'store_manager')` gates staff-only routes.

## Routes so far

| Method | Path                | Access                       |
|--------|---------------------|-------------------------------|
| GET    | /api/health          | public |
| GET    | /api/products         | public |
| GET    | /api/categories       | public |
| POST   | /api/products         | admin, store_manager |
| GET    | /api/orders/mine       | authenticated (own orders only) |
| POST   | /api/orders           | authenticated (creates own order) |
| GET    | /api/orders           | admin, store_manager (all orders) |
| GET    | /api/inventory         | admin, store_manager |

## Schema

`prisma/schema.prisma` mirrors the tables already live in your Supabase
Postgres database (`profiles`, `categories`, `products`, `store_locations`,
`inventory`, `orders`, `order_items`, `audit_log`). It was hand-written to
match the existing SQL exactly, so no migration is needed on the DB side —
just point `DATABASE_URL` at it and generate the client.
