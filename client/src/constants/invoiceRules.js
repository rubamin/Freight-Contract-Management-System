// Business rules applied to every invoice row on create and edit.
// Keep in sync with server/constants/invoiceRules.js.
export const MIN_FREIGHT_CHARGE = 100;

export const MIN_FREIGHT_CHARGE_MESSAGE = `Freight Charge must be at least ₹${MIN_FREIGHT_CHARGE}.`;

// True when the freight charge is blank, not a number or below the minimum.
export const isFreightChargeTooLow = (value) => !(parseFloat(value) >= MIN_FREIGHT_CHARGE);

// Sales Order number of a trip - InvoiceHeader.SONumber is NVARCHAR(50).
export const MAX_SO_NUMBER_LENGTH = 50;
export const SO_NUMBER_LABEL = "SO Number";
