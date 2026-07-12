---
name: verify
description: Build/launch/drive recipe for verifying pos-backend HTTP endpoints against a throwaway local Postgres.
---

# Verify pos-backend

Backend is Express + `pg` (Postgres/Supabase). Surface = HTTP API. Never drive
against the prod Supabase in `.env` — spin a local Postgres.

## Handle

1. Start Docker Desktop if daemon down:
   `powershell.exe -NoProfile -Command "Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe'"`
   then poll `docker info` until ready.
2. Local DB: `docker run -d --name pos-verify-db -e POSTGRES_PASSWORD=test -e POSTGRES_DB=posverify -p 55432:5432 postgres:16-alpine`
3. Start server pointed at local DB (inline env wins over `.env`; dotenv does not override):
   `DATABASE_URL="postgresql://postgres:test@localhost:55432/posverify" JWT_SECRET="testsecret123" PORT=4100 npx tsx src/index.ts &`
4. Schema auto-inits lazily on first `/api/*` request (idempotent CREATE/ALTER IF NOT EXISTS).

## Auth

Endpoints need a JWT. Forge instead of login (login PIN hash needs pgcrypto):
`node -e "console.log(require('jsonwebtoken').sign({kind:'employee',id:'x',name:'x',role:'stocking'},'testsecret123',{expiresIn:'1d'}))"`
Roles with stock access: stocking / admin / owner / super_admin. `kind:'admin'` always passes.

## Drive

Seed test rows via `docker exec pos-verify-db psql -U postgres -d posverify -c "..."`
(products need a category_id; is_track_stock=1 for stock logic). Then curl endpoints,
assert with psql SELECT on products.stock / cashier_stock and inventory_movements.

## Cleanup

`docker rm -f pos-verify-db` and kill the tsx process.

## Gotchas

- inventory_movements gains `scope` column via ALTER (default 'warehouse'); cashier stock
  split lives in products.cashier_stock (ALTER, default 0).
- cashier-opname decrease returns diff to warehouse (2 ledger rows, shared reference_id);
  increase only bumps cashier_stock (1 row, no ref).
