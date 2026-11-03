// Business rules applied to every invoice row on create and edit.
// Keep in sync with client/src/constants/invoiceRules.js.
const MIN_FREIGHT_CHARGE = 100;

const MIN_FREIGHT_CHARGE_MESSAGE = `Freight Charge must be at least ₹${MIN_FREIGHT_CHARGE}.`;

// InvoiceHeader.SONumber is NVARCHAR(50) (migration_v15).
const MAX_SO_NUMBER_LENGTH = 50;

module.exports = { MIN_FREIGHT_CHARGE, MIN_FREIGHT_CHARGE_MESSAGE, MAX_SO_NUMBER_LENGTH };
