# Freight Contract Management System

A web app for managing freight vendors, contracts and rate matrices, and for
uploading, auditing and approving transporter invoices against those
contracts.

- `server/`: Node.js, Express and Sequelize API on SQL Server
- `client/`: React, Vite and MUI front end
- `database/`: SQL Server migration scripts and a reference schema

## Prerequisites

- Node.js 18 or later, with npm
- SQL Server 2017 or later, and SQL Server Management Studio (SSMS) or
  another T-SQL client
- An existing `FreightContractDB` database. The migrations update it; they
  do not create it from scratch.
- An SMTP account (for example Gmail with an app password). Account emails
  must send, or users cannot be created.

## 1. Install dependencies

```bash
cd server
npm install

cd ../client
npm install
```

## 2. Configure the server

Copy `server/.env.example` to `server/.env` and fill in the values.

| Variable | Purpose |
|---|---|
| `DB_SERVER`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | SQL Server connection |
| `PORT` | API port, for example `5000` |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Signing secret and lifetime (for example `1d`) of sign-in tokens |
| `APP_URL` | Address people open the app at, used for links in emails. Use the server's LAN IP or domain, not `localhost`. `CLIENT_URL` is read if this is blank. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | Mail server. Gmail: `smtp.gmail.com`, `587`, `false` |
| `SMTP_USER`, `SMTP_PASS` | Mail login. The older `EMAIL_USER` / `EMAIL_PASS` keys still work. |
| `SMTP_FROM` | Sender address. Defaults to `SMTP_USER`. |
| `MAIL_DEV_LOG` | `true` prints emails to the server log instead of sending them. Local testing only. |

The client calls the API at `http://localhost:5000/api`. Change `baseURL` in
`client/src/config/axios.js` if the server runs elsewhere.

## 3. Update the database

Back up `FreightContractDB` first. Then, in SSMS, run each script in
`database/` against it in this order:

1. `migration_v2.sql`
2. `migration_v3.sql`
3. `Migration v4.sql`
4. `migration_v5.sql`
5. `Migration v6.sql`
6. `migration_v7.sql` to `migration_v17.sql`, in number order
7. `migration_v18.sql` drops tables the app no longer uses. Read its header
   first, and export any of those tables you still want to keep.

Every script is safe to re-run; each change checks whether it is already
applied.

`database/schema_full.sql` is a reference copy of the schema, for comparing
against your database. You do not need to run it. `database/SQL Files/`
holds the original per-table scripts and SSMS exports of the database.

## 4. Run

```bash
# API (use "npm run dev" to restart on file changes)
cd server
npm start

# Front end, in a second terminal
cd client
npm run dev
```

To build the front end for production, run `npm run build` in `client/`.
The output goes to `client/dist/`.

## First sign-in

Users are created only by an Admin, in User Master. There is no
self-registration.

To set the first Admin's password, run this in `server/`:

```bash
node scripts/setAdminPassword.js <admin email>
```

You type the password twice. It must meet the password rules below.

## Accounts and passwords

- **New user:** the Admin adds the user without a password. The app emails a
  random temporary password with the login ID. If that email fails, the user
  is not created.
- **First sign-in:** a user with a temporary password must set their own
  password before anything else opens.
- **Forgot password:** the user gets a 6-digit code by email. A code is
  valid for 10 minutes, works once, and allows 5 wrong tries.
- **Admin reset:** in User Master, "E-mail new password" sends a new
  temporary password.
- **Change password:** from the user menu, on My Profile.
- **Sessions** end at once when the password changes, the Admin resets it,
  or the user is deactivated.

Password rules (shown as a live checklist on screen; the server makes the
final check):

- At least 11 characters
- An upper-case letter, a lower-case letter, a number and a special
  character
- No spaces
- Must not contain the user's name or email ID
- Must not be the current password or one of the last 3

## Main features

- **Masters:** vendors with GST numbers, destinations, vehicle types,
  weights and customers, with bulk upload from Excel. Changes can need an
  approver's sign-off (Master Approvals).
- **Contracts:** contracts per vendor and contract type, with rate matrices
  imported from the Excel templates in `client/public/templates/`.
- **Invoices:** add and edit invoices with drafts that can be shared, an
  automatic audit against the contract rates, and document uploads.
- **Approval workflow:** approval steps per location; approvers act from
  My Approvals.
- **Access control:** module and location permissions per user, and access
  requests that an Admin approves.
- **Dashboard and Reports:** summary cards, charts and Excel report export.
- **Notifications:** an in-app bell with sound, plus email notices.
- **Admin tools:** Settings & Hierarchy, and Update Database to clear a
  module's data (it lists dependent modules and asks you to type `TRUNCATE`
  to confirm).

## Project layout

```
client/src/
  components/   shared UI pieces, grouped by feature
  pages/        one folder per screen
  services/     API calls
  redux/        store and slices
  constants/, utils/, hooks/, routes/, layouts/, styles/
server/
  routes/ -> controllers/ -> services/ -> models/   request flow
  middleware/   auth, permission and upload checks
  constants/, utils/, helpers/, validators/, validations/
  scripts/      setAdminPassword.js
  uploads/, draft_uploads/   files users upload at run time
database/
  migration_v*.sql, schema_full.sql, SQL Files/
```
