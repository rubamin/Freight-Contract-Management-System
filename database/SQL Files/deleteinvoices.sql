BEGIN TRANSACTION;

-- Child table
DELETE FROM VerificationErrors;

-- Parent table
DELETE FROM InvoiceVerification;

-- Other invoice tables
DELETE FROM InvoiceItems;
DELETE FROM InvoiceHeader;

-- Reset Identity
DBCC CHECKIDENT ('VerificationErrors', RESEED, 0);
DBCC CHECKIDENT ('InvoiceVerification', RESEED, 0);
DBCC CHECKIDENT ('InvoiceItems', RESEED, 0);
DBCC CHECKIDENT ('InvoiceHeader', RESEED, 0);

COMMIT TRANSACTION;