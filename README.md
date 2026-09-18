# Freight Contract Management System — v2

This package contains the updated Freight Contract Management application:
a Node.js/Express + Sequelize backend (`server/`) and a React + Vite
frontend (`client/`), along with the SQL Server migration and reference
schema needed to bring an existing `FreightContractDB` database up to date
(`database/`).

## Prerequisites

- **Node.js 18.x or later** (LTS recommended) and npm
- **SQL Server 2017 or later** (Developer or Express edition is fine for
  local/dev use), with SQL Server Management Studio (SSMS) or another
  T-SQL client to run the migration script
- An existing `FreightContractDB` database with the pre-v2 schema already
  in place (this package updates it — it does not create it from scratch)

## 1. Install dependencies

From the project root:

```bash
cd server
npm install

cd ../client
npm install
```

## 2. Configure the server environment

Copy `server/.env.example` to `server/.env` and fill in real values:

| Variable | Purpose |
|---|---|
| `DB_SERVER` | SQL Server hostname/instance |
| `DB_NAME` | Database name (`FreightContractDB`) |
| `DB_USER` | SQL Server login username |
| `DB_PASSWORD` | SQL Server login password |
| `PORT` | Port the API server listens on (e.g. `5000`) |
| `JWT_SECRET` | Secret used to sign auth tokens |
| `JWT_EXPIRES_IN` | Auth token lifetime (e.g. `1d`) |
| `EMAIL_USER` | Gmail address used to send audit/notification emails |
| `EMAIL_PASS` | Gmail app password for `EMAIL_USER` |

No secrets are included in this package — `.env.example` lists variable
names only.

## 3. Run order

Run these in exactly this order:

1. **Database migration** — open `database/migration_v2.sql` in SQL Server
   Management Studio, connect to the server hosting `FreightContractDB`,
   and execute it top-to-bottom against that database. It's safe to
   re-run (every change is guarded with an existence check).
   - Back up `FreightContractDB` before running this against a
     production copy.
   - `database/schema_full.sql` is included as a full reference copy of
     the schema after migration — useful for diffing against your actual
     database, not something you need to run.
2. **Start the server**:
   ```bash
   cd server
   npm start
   ```
   (or `npm run dev` for auto-restart on file changes during development)
3. **Start the client**:
   ```bash
   cd client
   npm run dev
   ```

The client expects the API at `http://localhost:5000/api` (see
`client/src/config/axios.js`) — adjust there if the server runs elsewhere.

## Changelog (v1 to v2)

1. **Fixed invoice upload FK crash** — invalid/mismatched `PlantID` values
   from the frontend no longer cause a raw SQL foreign-key error; the
   server now validates and falls back to a default plant, with a clean
   user-facing error message.
2. **Fixed missing `CustomerName` on invoices** — added the field to the
   Sequelize model so it now round-trips correctly to the Invoice List.
3. **Added `LocationName` to invoices** — invoices now store a resolved
   plant/location name at upload time; existing rows are backfilled.
4. **Fixed bulk "send selected invoices" email routing** — bulk email now
   groups invoices by plant/location and routes each group to that
   location's configured approver, matching the single-invoice upload
   flow instead of always emailing one fixed address.
5. **Removed the Vehicle Number field entirely** — from the database
   model, upload flow, and both invoice UI pages.
6. **Reworked From/To station logic on Add Invoice** — "From" is now a
   read-only value derived from the selected plant/location; "To" is a
   selection-only dropdown sourced from the destination master list (no
   more free-typed values).
7. **Standardized invoice date display** — `Invoice Date`/`LR Date` now
   display as `DD/MM/YYYY` via a shared date-formatting utility and MUI
   date pickers, while the underlying stored format is unchanged.
8. **Added Profile and Settings pages** — users can update their name,
   email, and profile photo, change their password, and set notification
   and default-plant preferences.
9. **Added a Dashboard page** — summary cards (invoice count/amount,
   pending verification, discrepancies) and charts (monthly trend,
   status distribution, top vendors), backed by one aggregated API
   endpoint with date-range filtering.
10. **Added a Reports page** — filter invoices by date range, vendor,
    plant/location, and status, then download the results as a
    formatted `.xlsx` file.
11. **General UI/UX improvements** — collapsible sidebar (state persists
    across refreshes), a notification bell with sound for key invoice
    events (new invoice, discrepancy, email sent), and a more centralized
    MUI theme so colors/spacing/typography are consistent across pages.

## Known pre-existing items (not introduced by this update)

- `server/services/crud.service.js` and `server/routes/workflowRoutes.js`
  reference an `AuditLog` model that isn't defined in
  `server/models/index.js`. This predates this update and wasn't part of
  any task in this cycle; the audit-log and some workflow sub-routes will
  error if exercised until that model is added.
- `database/schema_full.sql` notes a `RolePermissions` table referenced by
  `server/models/RolePermission.js` that wasn't present in the original
  schema reference this project was built from. If it already exists in
  your live database, this is just a documentation gap, not a missing
  table.
