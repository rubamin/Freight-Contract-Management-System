// Limits and options of the Add Invoice page.
export const MAX_INVOICES = 25;
// Trip lines per invoice - one invoice often covers 2 to 3 trips.
export const MAX_ITEMS_PER_INVOICE = 10;

export const ZOOM_LEVELS = [75, 90, 100, 110, 125, 140];

// Supporting documents belong to the invoice, not to each trip.
export const DOCUMENT_FIELDS = [
  { field: "supportingDoc1", label: "Supporting Doc 1", uploadKey: "doc1" },
  { field: "supportingDoc2", label: "Supporting Doc 2", uploadKey: "doc2" },
  { field: "supportingDoc3", label: "Supporting Doc 3", uploadKey: "doc3" },
];

// Upload requests carry attachments, so they get more time than the
// default API timeout.
export const UPLOAD_TIMEOUT_MS = 60000;
 