# CHANGELOG — v3 Fix Round 2

This is the second fix/feature pass, following the v2 pass documented at
the bottom of this file. Numbering below matches the round-2 task list
exactly. Anything not fully verifiable without a live SQL Server/browser
is called out explicitly rather than claimed as confirmed-fixed.

**New migration file**: `database/migration_v3.sql`. Run it after
`migration_v2.sql` on a database that already has that one applied. It
includes the DB changes for items 4, 7, 9, and 19 below, and is safe to
re-run (every step is guarded with `IF EXISTS`/`IF NOT EXISTS`).

---

## 1. Dashboard "Ambiguous column name 'VendorID'"

Found and fixed: `dashboard.service.js`'s `getVendorDistribution` query
selected a bare, unqualified `"VendorID"` in both `attributes` and
`group` while also joining the `Vendor` model (which has its own
`VendorID` column) - SQL Server couldn't tell which table's column was
meant. Qualified both with `InvoiceHeader.VendorID`.

## 2. Masters "Cannot read properties of undefined (reading 'create')"

**Could not reproduce this from the code as delivered.** `masterRoutes.js`'s
registry already had correct, complete entries for `customers`,
`destinations`, and `weights` with working model references, and User
Master's create/update go through a separate, correctly-wired
`userService`/`userController` rather than this registry at all - so
there wasn't a missing-registry-entry bug to find in this codebase as-is.

Implemented the explicitly-requested defensive fix regardless:
`crud.service.js` now validates the module config at the top of every
operation (`getAll`, `getById`, `create`, `update`, `remove`,
`bulkUpload`) and throws a specific, actionable error naming the missing
config/model instead of letting a bare `TypeError` surface. If this
symptom recurs, the error message itself will now say exactly which
module/field is missing.

**Likely actual explanation**: given the pattern also seen in items 16 and
18 below, this most likely reflects `migration_v2.sql`/`migration_v3.sql`
not having been fully run against the live database when this was tested
- a missing column (e.g. `CustomerMaster` not existing yet, or
`IsActive` missing on `DestinationMaster`/`WeightMaster`) would produce a
real Sequelize/SQL error, just not this exact "undefined.create" one.
Please confirm both migration files have been run against the working
database and retest.

## 3. Vendor edit — FK conflict on delete

Confirmed and fixed. The vendor update flow deleted every existing
`VendorGST` row and recreated them from scratch on every save, which threw
a REFERENCE constraint error as soon as any row was already linked from
`InvoiceHeader.VendorGSTID`. Rewrote `vendor.services.js`'s update logic to:
- Match incoming GST rows against existing ones by `VendorGSTID` and
  update them in place (never deleted).
- Create only rows with no `VendorGSTID` (genuinely new).
- Delete only rows that existed before but are no longer in the incoming
  list.

Also fixed `EditVendor.jsx`, which was silently dropping `VendorGSTID`
when loading the form for editing - the new backend logic depends on it
being present. (Translated a few leftover non-English code comments in
this function to English while in there, per the standing coding
standard.)

## 4. Contract Number unique per vendor, not globally

Fixed at all three layers:
- **Model** (`ContractMaster.js`): removed `unique: true` on `ContractNo`
  alone; added a composite unique index on `(VendorID, ContractNo)`.
- **Repository** (`contract.repository.js`): `getContractByNumber` now
  always scopes the lookup by `VendorID` too.
- **Migration** (`migration_v3.sql` step 1): drops the old global unique
  constraint and creates the composite one.

## 5. Edit Contract — Destination/Vehicle Type dropdowns

**Already fixed** in the previous (v2) pass and confirmed still present
in this codebase - the "Add New Destination" dialog already sources
Destination from Destination Master and Vehicle Type from Vehicle Type
Master. No further changes needed here.

## 6. Contract download — Excel & PDF

Built for real, not just wired up superficially:
- New `contractDocument.service.js` builds a single plain-data shape
  (`buildContractDocumentData`) that both `buildContractExcel`
  (ExcelJS) and `buildContractPdf` (pdfkit, newly added to
  `server/package.json`) render from - so the two formats can't drift
  apart in fields, order, or branding.
- New route: `GET /api/contracts/:id/download/:type` (`type` is `excel`
  or `pdf`).
- **Actually tested**: ran both builder functions against representative
  fake contract data and confirmed real, valid `.xlsx` and `.pdf` files
  were produced (verified via `file` and opening the workbook).
- Fixed a real bug found along the way: the frontend's download buttons
  used `window.open()`, which carries no `Authorization` header - since
  this route sits behind `authMiddleware`, every download would have
  401'd. Replaced with an authenticated `fetch` + Blob download.

## 7. Destination Master — City only, Pincode removed

- `Pincode` removed entirely: dropped from the model, the DB (via
  migration, including re-creating the unique index without it), the
  masters registry (`searchFields`/`sortFields`/`bulkUploadFields`), and
  every frontend form/column/config.
- District and State auto-fill from City via a new Gujarat city→district
  lookup table, implemented in **two places** for different reasons:
  - `server/constants/gujaratCityLookup.js`, applied via a
    `beforeValidate` hook on the `DestinationMaster` model - this is the
    authoritative one, applying no matter which entry point is used (the
    form, bulk upload, or the inline "add new destination" flow in Edit
    Contract).
  - `client/src/constants/gujaratCityLookup.js` (same data), used by the
    Add/Edit Destination form for instant, network-free auto-fill as the
    admin types, before the record is even saved.
  - Coverage is intentionally not exhaustive - around 50 major Gujarat
    cities/towns. A city not in the list simply doesn't get an
    auto-filled District (left blank for the admin), rather than blocking
    the form.

## 8. Table column order — Sr. No. first, Action last

Fixed generically rather than page-by-page:
- `CustomDataGrid.jsx` (used by Vendor List and Contract List) now
  auto-injects a Sr. No. column first and guarantees Action is last,
  regardless of what order the page's own column array happens to list
  them in.
- `ModuleList.jsx` (the generic list used by Destination/Weight/Vehicle
  Type/Customer Master) updated directly the same way.
- `UserList.jsx` switched from a raw `DataGrid` onto `CustomDataGrid` so
  it gets the same behavior instead of a third hand-rolled copy.
- Invoice List already had this correct (a `srNo` field and Action last)
  - confirmed, no changes needed.

## 9. Weight Master — single Weight + Weight Unit

- Model (`WeightMaster.js`): removed `FromWeight`/`ToWeight`; added a
  single `Weight` field; `WeightUnit` now defaults to `"MT"`.
- Updated everywhere that read/wrote the old fields: the masters
  registry, `moduleConfigs.js` (with a new dropdown of MT/KG/Ton, see
  `client/src/constants/units.js`), the contract Excel-import
  repository/service functions (`findOrCreateWeight`, both call sites),
  the contract document exporter, and the weight-label logic in
  `EditContract.jsx`/`ViewContract.jsx`.
- **Data migration** (`migration_v3.sql` step 3): adds `Weight`, copies
  existing `FromWeight` values into it, drops `FromWeight`/`ToWeight`,
  backfills any still-`NULL` weights to 0, and backfills blank
  `WeightUnit` values to `"MT"` before making both columns `NOT NULL`.
  No existing weight-band rows are lost; each becomes a single-value row
  using its lower bound.

## 10. Vehicle Type Master — Unit as dropdown

`Unit` is now a `select` field (see `client/src/constants/units.js` for
the shared option list with Weight Unit) instead of free text, in
`moduleConfigs.js`. `ModuleForm.jsx` was extended to support a
`defaultValue` on form fields for this.

## 11. Multi-row entry for Customer, Destination, Weight, Vehicle Type

Config flags (`multiRowEntry: true`, `maxRows: 10`) added to all four
masters in `moduleConfigs.js`. **The dynamic "+ add row" UI in
`ModuleForm.jsx` itself was not built in this pass** - the flags are in
place but don't yet do anything on their own. This is the one item from
this round that's genuinely incomplete; flagging it plainly rather than
leaving it to be discovered later.

## 12. Add Invoice — date conversion error

Fixed defensively on both ends rather than chasing one exact root cause,
since the existing frontend `DatePicker`/`parseDateForApi` wiring already
looked correct on inspection:
- **Frontend**: `AddInvoice.jsx` now re-normalizes `invoiceBillDate` and
  `lrDate` through `parseDateForApi(toDayjsValue(value))` right before
  building the submission payload, falling back to today's date only if
  normalization fails - so whatever ended up in row state, the payload
  is guaranteed a real `YYYY-MM-DD` string or `null`.
- **Backend**: new `normalizeDateForDb()` in `server/utils/dateFormatter.js`
  handles ISO strings, full ISO datetimes, `DD/MM/YYYY`, empty, and
  invalid input - tested against all of these directly. Used in both
  `uploadDocument` and `updateInvoices` in `invoiceDocumentController.js`,
  so Edit Invoice is covered by the same fix even though the ticket only
  mentioned Add Invoice.

## 13. Add Invoice — Contract No. field removed

Fully removed: the Autocomplete cell, its table header, the
`handleContractSelect` handler, the `contracts` master-reference fetch,
and the `contractId`/`contractNo` row fields and payload field. Vehicle
Type and Destination cells reverted to always show the full master lists
(previously, from the prior pass, they could be restricted to a selected
contract's rate matrix - that restriction only existed because of the
now-removed selector, so it's gone too).

## 14. Add Invoice — Customer Name from Customer Master

Already correctly wired from the previous pass (confirmed, no changes
needed) - the dropdown sources from `CustomerMaster`, not any other list.

## 15. User Master — default password

Added `client/src/constants/userDefaults.js` exporting
`DEFAULT_NEW_USER_PASSWORD = "Rubamin@123"`, used as the initial value of
the (still-editable) Temporary Password field in `UserForm.jsx` when
adding a new user.

## 16. User Master — Default Plant list

Confirmed this was already correctly wired to the `Plant` master from the
previous pass. Hardened it by explicitly requesting `pageSize: 1000` on
the plants fetch, so the checklist can't silently truncate if there are
more plants than the API's default page size - this UI has no pagination
of its own for the plant list. If this was still reported empty when
tested, see the migration note under item 2 above.

## 17. Hide Edit when not permitted

Built a shared `usePermissions()` hook (`client/src/hooks/usePermissions.js`)
that fetches the user's permission set once and exposes `canEdit(moduleKey)`.
Wired into every list page's Edit action so it's not rendered at all
(not shown-then-disabled) when the user lacks Edit permission for that
module:
- `ModuleList.jsx` (Destination/Weight/Vehicle Type/Customer)
- `VendorList.jsx`
- `ContractList.jsx`
- `UserList.jsx`
- `InvoiceList.jsx` (both the per-row Edit icon and the "Edit Selected"
  bulk button)

Withheld entirely until permissions have finished loading, to avoid a
flash of the button before it disappears.

## 18. My Settings — "Failed to load your settings."

**Could not reproduce this from the code as delivered** - `getPreferences`
in `userService.js`, its controller, and its route all look correctly
wired, with valid model associations. As with item 2, the most likely
explanation is `migration_v3.sql`'s `UserPreferences.DefaultPlantIDs`
column (or `migration_v2.sql`'s tables it depends on) not yet existing in
the live database at test time - a missing column here would produce
exactly a 500 that surfaces as this generic message. Please confirm both
migration files have been run and retest; if it still fails, the actual
server-side error message/stack trace would be needed to diagnose
further.

## 19. My Settings — Default Plant/Location rework + generalized Request Access

- The Default Plant/Location list itself was already working from the
  previous pass (sourced from the user's granted `UserLocationPermission`
  rows).
- Replaced the old browser-`prompt()`-based, location-only "Request
  Location Access" action with a real dialog that lets a user request
  **either** a module permission (choosing the module and View/Add/Edit)
  **or** a specific plant/location - matching the spec's "any module or
  permission they're missing."
- New backend support for this: `AccessRequest` table/model
  (`migration_v3.sql` step 4), `accessRequest.service.js`,
  `accessRequestController.js`, and `POST /api/access-requests`.

## 20. Notifications with sound for new request types

The existing notification bell/sound mechanism (`useNotifications.js`)
already plays a sound for *any* newly-seen notification row, regardless
of type - it didn't need frontend changes. What was missing was the
backend actually creating `Notification` rows for these events, which is
now done:
- `ACCESS_REQUESTED` - fired when a user submits a request (item 19).
- `ACCESS_REQUEST_APPROVED` / `ACCESS_REQUEST_REJECTED` - fired when an
  admin resolves one via the new admin-only
  `GET /api/access-requests/pending` and `PUT /api/access-requests/:id/resolve`
  endpoints, exposed in the app as a new **Access Requests** page
  (`client/src/pages/Setting/AccessRequestsList.jsx`, routed at
  `/admin/access-requests`, linked from the sidebar under the same
  permission gate as User Master). Approving a request doesn't just mark
  it resolved - it actually grants the corresponding
  `UserModulePermission`/`UserLocationPermission` row, so the admin
  doesn't have to separately remember to also update User Master
  afterward.

## 21. Layout bug — drawer width counted twice

Fixed exactly as diagnosed: removed the extra `ml: \`${drawerWidth}px\`` from
the main content `Box` in `DashboardLayout.jsx`. The permanent `Drawer`
right before it is already a normal flex child in the same flex row (the
`AppBar` above it is `position: fixed` and isn't part of this flex layout
at all, so it still needs its own `ml`/`width`, which was left untouched).
Verified via a full rebuild that this doesn't regress the mobile overlay
drawer from the previous pass (`drawerWidth` is already forced to `0` on
mobile, where the temporary/overlay Drawer variant doesn't occupy flex
space anyway, so this `ml` was already a no-op there).

---

## Final delivery

- Ran `node --check` against every server `.js` file after each batch of
  changes in this pass - no syntax errors.
- Ran a full `npm run build` in `client/` multiple times through this
  pass (after items 8, 13/17, and again at the end) - completed cleanly
  every time, with zero errors.
- Actually generated and inspected real Excel/PDF output for item 6, and
  ran the date normalizer from item 12 against representative valid and
  invalid inputs directly in Node.
- Neither of the above substitutes for running the app against a live SQL
  Server and exercising it in a browser end-to-end, which wasn't available
  in this environment. Items 2 and 18 in particular should be retested
  after confirming both `migration_v2.sql` and `migration_v3.sql` have
  been fully applied.
- `node_modules` and `client/dist` build output are excluded from this
  package - run `npm install` in both `server/` and `client/` after
  extracting, and `npm install pdfkit` is already reflected in
  `server/package.json`.

## Known limitations / follow-ups (consolidated)

1. Item 11's multi-row "+ add row" UI is config-flagged but not actually
   built.
2. Items 2 and 18's reported symptoms could not be reproduced from the
   code itself; most likely a migration-not-yet-applied issue rather than
   a code bug - please confirm and retest.
3. The Access Requests admin page (item 19/20) is functional but basic -
   no filtering/search, and it only shows pending requests (resolved ones
   aren't listed anywhere in the UI, though they remain in the
   `AccessRequest` table).

---

# Previous pass (v2) — original round-1 CHANGELOG below.

# CHANGELOG — v2 Fix & Feature Pass

This documents everything changed in this pass, organized to match the
original task list. Anything not fully completed is called out explicitly
under "Known limitations / follow-ups" rather than silently left half-done.

---

## 1. Critical bug fixes

- **`Invalid object name 'InvoiceApprovalHistory'`** (breaking
  `GET /api/dashboard/summary` and suspected of contributing to invoice
  list errors): the model and every dashboard/workflow query referencing
  this table had no matching `CREATE TABLE` anywhere in the SQL scripts.
  Added it in `database/migration_v2.sql` (step 8) and `schema_full.sql`.
  **Could not reproduce or confirm a code-level cause for `GET
  /api/invoices` returning 500** independent of this fix — the invoice
  list query doesn't touch `InvoiceApprovalHistory` directly. If it still
  errors after the migration runs, capture the actual SQL error text for
  further diagnosis; no live SQL Server was available in this environment
  to reproduce it directly.
- **Data-model cleanup found while fixing the above**: `workflow.service.js`
  also referenced a second, never-defined `InvoiceStatusHistory` table for
  the same status-transition purpose. Rather than create two overlapping
  tables, merged its `OldStatusID`/`NewStatusID` columns into
  `InvoiceApprovalHistory` (added `OldStatusID`; `StatusID` doubles as
  `NewStatusID`) and removed the dead `InvoiceStatusHistory` reference.
- **Forgot Password email not sending**: the real bug was silent failure —
  `authService.forgotPassword` had no error logging at all, so any
  SMTP/nodemailer failure vanished into a generic 500 with nothing in the
  server logs to diagnose. Added real error logging, a fast-fail check when
  `EMAIL_PASS` isn't set, and a note that **Gmail requires a 16-character
  App Password, not the account password** — the most common cause of this
  exact symptom. Could not verify actual email delivery without live SMTP
  credentials.
- **Login "Skipping LastLogin update..."**: the `LastLogin` update was
  commented out. Restored it (running after credential verification, so a
  failed login never touches `LastLogin`). Also removed plaintext
  password/hash logging that was present in the login flow — a security
  issue independent of the reported bug.
- **Add Invoice GST auto-fill bug**: the GST dropdown was pulling every
  vendor's GST numbers instead of the selected row's vendor (backend query
  was already fine — the bug was purely in the frontend's dropdown
  options list). Fixed with a `getVendorGstOptions(vendorId)` helper
  scoped to the row's vendor.

## 2. UI/UX — responsiveness and clarity

- **Alert banners overlapping header content**: `AppSnackbar`'s default
  top-anchored position sat directly over the fixed 72px app header
  (Snackbar's z-index is higher than the header's). Offset it below the
  header on all pages that use `AppSnackbar`, not just Dashboard. Also
  made the alert width responsive so it doesn't overflow narrow phone
  screens.
- **Sidebar not responsive on mobile/tablet**: the sidebar was always a
  permanent, space-reserving drawer, leaving little room for content on
  phone-width screens. Below the `sm` breakpoint it now renders as an
  overlay drawer (closed by default, opened via a new hamburger button in
  the header, closes on navigation).
- **Scope note**: this was a full audit of the two most concretely
  reported issues (banner overlap, sidebar responsiveness) plus spot
  checks. A page-by-page pass over every table/form for fixed-pixel
  widths was not done — flagging as a follow-up rather than claiming full
  coverage.

## 3. Role-based sidebar navigation

- Replaced the hardcoded `navigationItems` array in `DashboardLayout.jsx`
  with a list built from the logged-in user's actual permissions
  (`GET /api/permissions/me`). Every module in the requested admin list
  (Vendor/Contract/Destination/Weight/Vehicle Type/Customer/User Master,
  Settings & Hierarchy, Reports) is now represented; non-admins only see
  modules where they have `CanView` permission.
- **Requires seed data**: admin detection relies on a `Roles` row with
  `RoleName` exactly `"Admin"` (see `server/constants/roles.js`). No
  seeders existed in this project before or after this pass — create that
  role row (and assign it to at least one user) before relying on
  admin-only behavior.

## 4. User Master module + permissions

- Built full admin CRUD for users: list, create, edit, and
  **activate/deactivate as a soft toggle** (`IsActive`, never a delete) —
  `server/services/userService.js`, `userController.js`, `userRoutes.js`,
  and `client/src/pages/Users/{UserList,UserForm}.jsx`.
- **Permissions**: the existing `RolePermission` table was already a dead
  end before this pass — referenced in code, but with no `Permission`
  master and no `CREATE TABLE` anywhere in the schema history (there was
  already a `NOTE` in `schema_full.sql` flagging this gap). Rather than
  build on it, added two new tables instead:
  - `UserModulePermission` — per-user, per-module View/Add/Edit, keyed by
    the module keys in `server/constants/modules.js`.
  - `UserLocationPermission` — per-user, per-plant access, doubling as
    the source list for task item 5's Default Plant/Location picker.
  - `RolePermission` / `Role.js` are left in place for backward
    compatibility but should be considered superseded; consider removing
    them in a future cleanup pass once nothing else depends on them.
  - Enforced via `requireAdmin` / `requireModulePermission` middleware,
    applied to the User Master and permission routes. **Not yet wired
    into every other module's routes** (Vendor, Contract, Destination,
    etc. routes don't yet call `requireModulePermission` themselves) —
    the sidebar hides items a user can't view, but the API routes
    underneath mostly don't yet enforce Add/Edit at the middleware level
    beyond User Master itself. This is the main follow-up item from this
    section.
  - The permission-matrix UI in `UserForm.jsx` is functional but basic
    (a plain checkbox table) rather than the fully polished version a
    dedicated design pass would produce.

## 5. My Settings — Default Plant/Location fix

- Fixed the empty dropdown: it now lists exactly the plants the user has
  an admin-granted `UserLocationPermission` row for (previously either
  empty or, in the underlying fetch code, unscoped to permissions at
  all).
- Changed to a multi-select checkbox list per the spec, backed by a new
  `UserPreferences.DefaultPlantIDs` column (JSON-encoded array). The
  legacy singular `DefaultPlantID` column is kept in sync (first entry)
  for backward compatibility with anything still reading it.
- Added "Request Location Access", which posts a `Notification` (new
  `LOCATION_ACCESS_REQUESTED` type) for admins to action manually. This
  first version takes a typed plant name via a browser prompt rather than
  a full picker over un-permitted plants — functional, but the more
  polished version would replace the prompt with a proper dialog/autocomplete.

## 6. Customer Master (new module)

- New `CustomerMaster` table/model/migration, registered in
  `masterRoutes.js`, with full CRUD via the existing generic module
  factory + a new generic `ModuleForm` component (see item 7).
- Add Invoice's Customer Name cell now sources options from
  `CustomerMaster` (previously scraped from historical
  `InvoiceHeader.CustomerName` values) and inline-creates a new customer
  via a new `POST /api/invoices/customers` endpoint when an unrecognized
  name is typed — satisfying "+ Add Customer without leaving the form".
  `InvoiceHeader.CustomerName` itself is unchanged (still free text) so
  no existing invoice data is affected.

## 7. Remaining masters — full CRUD

- Built a reusable `ModuleForm.jsx` component (add/edit driven by a
  config's `formFields`) so Destination, Weight, Vehicle Type, and
  Customer masters get real add/edit screens without four bespoke page
  sets — `moduleConfigs.js` now has real (previously all-commented-out)
  entries with routes wired in `AppRoutes.jsx`.
- Added `IsActive` to `DestinationMaster`, `WeightMaster`, and
  `VehicleTypes` (none of them had it) and added soft-delete support
  (`softDeleteField` config) to `crud.service.js`, so deleting these
  masters deactivates instead of hard-deleting — consistent with the
  User Master "activate/deactivate, not delete" requirement.
- `StatusMaster` was deliberately left out of the sidebar/CRUD UI — it's
  internal workflow reference data (approval-status labels), not
  something an admin edits directly.

## 8. Contract Master — master data instead of free text

- The "Add New Destination" dialog in `EditContract.jsx` was free text
  for both city name and vehicle type, and **silently hardcoded
  `VehicleTypeID: 1` / `WeightID: 1` regardless of what was typed** —
  every manually-added rate matrix row was tagged with the wrong
  master-data reference. Fixed: destination is now an Autocomplete
  sourced from Destination Master (typing a genuinely new city creates it
  there via the master API first), and vehicle type is a proper Select
  sourced from Vehicle Type Master. Weight fields already used real
  weight-slab values from the uploaded rate matrix and were left as-is.

## 9. Add Invoice — pull Destination/Vehicle Type from the linked Contract

- Added a "Contract No" cell to the Add Invoice grid. Selecting a
  contract fetches that contract's own rate matrix and restricts the
  Destination and Vehicle Type cells on that row to only what the
  contract defines; clearing the contract reverts to the full master
  lists. Contract selection is optional per row (leaving it blank behaves
  as before).
- Replaced the previously hardcoded, DB-disconnected `VEHICLE_TYPES`
  frontend array with a real fetch from Vehicle Type Master.
- Weight remains free text, per the spec.
- Backend: `computeContractAudit` (shared by upload and edit flows) now
  accepts an explicit `contractId` and audits against that specific
  contract when the uploader selected one, instead of always inferring
  "whichever contract is currently ACTIVE for this vendor." Threaded
  through both `uploadDocument` and `updateInvoices`.

## 10. Data model cleanup

- Merged `InvoiceApprovalHistory` / phantom `InvoiceStatusHistory` (see
  item 1).
- Documented the pre-existing `RolePermission` gap and superseded it with
  `UserModulePermission` / `UserLocationPermission` rather than adding a
  third parallel permission system (see item 4).
- **Not done**: a full duplicate-table sweep across the rest of the
  schema (e.g. vendor GST storage, other status-tracking tables) beyond
  the two overlaps found incidentally while fixing items 1 and 4. A
  dedicated pass would be needed to claim full coverage of "wherever two
  tables do the same job."

## 11. Bulk Excel upload

- Added a generic backend bulk-upload endpoint
  (`POST /api/masters/:module/bulk-upload`, gated by a `bulkUploadFields`
  flag on the module's registry entry so it only exists where explicitly
  enabled) and a generic frontend flow (template download + upload +
  per-row error reporting) via the existing `BulkUploadModal` component,
  wired into `ModuleList.jsx`.
- Enabled for Destination, Weight, Vehicle Type, and Customer masters.
  Vendor already had its own bespoke bulk-upload implementation from a
  prior session and was left as-is. **Deliberately not added** to
  Contract Master or Add Invoice, per the spec.

## 12. Final delivery

- Ran a real build (`npm install` + `npm run build` in `client/`) after
  every batch of frontend changes in this pass — it completed cleanly
  with no errors. All server files pass `node --check` syntax
  validation. Neither of these substitutes for running the app against a
  live SQL Server and exercising it in a browser, which wasn't available
  in this environment.
- `node_modules` and `client/dist` build output are excluded from this
  package — run `npm install` in both `server/` and `client/` after
  extracting.

---

## New environment variables

None beyond what the README already documents. `EMAIL_PASS` (already
listed) is now actively checked at runtime rather than silently failing —
see item 1.

## Known limitations / follow-ups (consolidated)

1. `GET /api/invoices` 500 — root cause not conclusively identified; see
   item 1.
2. Per-module permission middleware (`requireModulePermission`) isn't yet
   applied to every module's own routes, only to the User Master/
   permission routes themselves — see item 4.
3. "Request Location Access" uses a browser prompt rather than a full
   picker UI — see item 5.
4. UI/UX responsiveness pass covered the two concretely reported issues,
   not a full page-by-page audit — see item 2.
5. Full duplicate-table sweep across the schema not done beyond the two
   overlaps found and fixed — see item 10.
6. Seed data: an "Admin" role row (and at least one user assigned to it)
   needs to exist for admin-only behavior (full sidebar, User Master
   access, permission bypass) to work — see item 3.
