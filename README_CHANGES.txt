Send Selected Mail — Location-wise Approval Routing Fix
==========================================================

WHAT WAS WRONG (confirmed from your screenshots)
--------------------------------------------------
Your screenshot shows invoices from THREE different locations (N1, R1H4,
N2) all landing in a single email/table together — that's the bug. There
were actually two separate causes stacked on top of each other:

1. Frontend — client/src/pages/Invoices/InvoiceList.jsx
   The row data built for the Invoice List table (and sent to the backend
   when you click "Send Selected Mail") captured PlantID but never
   captured LocationID at all. So no matter what the backend did, every
   selected invoice reached the server with no real location identifier.

2. Backend — server/controllers/invoiceDocumentController.js
   sendSelectedInvoicesMail() grouped invoices by PlantID (an old,
   unrelated master table) and looked up the recipient using
   getRecipientEmailForLocation(plantId) — but ApprovalConfig.LocationID
   is defined against PlantLocations (the real N1/N2/... hierarchy), a
   completely different ID space from PlantID. Even with LocationID
   correctly reaching the server, this lookup would have kept missing and
   falling back to one default email for everyone.

THE FIX
-------
1. client/src/pages/Invoices/InvoiceList.jsx
   The row shape now includes LocationID (from invoice.LocationID /
   invoice.locationId / invoice.location?.LocationID), right next to the
   existing PlantID field.

2. server/controllers/invoiceDocumentController.js
   - groupInvoicesByPlantId() -> renamed to groupInvoicesByLocationId(),
     now groups by invoice.LocationID / invoice.locationId instead of
     PlantID.
   - sendSelectedInvoicesMail() now passes the real LocationID into
     getRecipientEmailForLocation(), so each group's email goes to that
     specific location's ApprovalConfig recipient (e.g. N1 -> Dhvani
     Darji's email) instead of one shared default.
   - Nothing else changed: the single-invoice upload/audit notification
     flow (sendAuditNotificationEmail via the other call site in this
     file) was already using LocationID correctly — only this bulk "send
     selected" flow had the bug.

RESULT
------
Selecting invoices from multiple locations and clicking "Send Selected
Mail" now sends one separate email per location, each addressed to that
location's own ApprovalConfig recipient, and each email's table contains
only that location's invoices — exactly like your screenshot's intent, but
actually split correctly instead of merged into one.

HOW TO APPLY
------------
Copy both files into the matching paths in your project (overwriting the
existing ones). No database migration needed for this fix — LocationID
already exists on InvoiceHeader from migration_v6.

HOW TO VERIFY
-------------
1. Make sure ApprovalConfig has an active recipient row for each of N1,
   R1H4, N2 (Settings & Hierarchy — wherever you manage that).
2. Select invoices spanning at least two different locations in Invoice
   List and click "Send Selected Mail".
3. Confirm you get one email per location, each only listing that
   location's invoices, sent to that location's configured recipient.

Both files were syntax-checked with esbuild before delivery.
