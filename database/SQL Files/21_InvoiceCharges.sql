CREATE TABLE InvoiceCharges
(
    ChargeID BIGINT IDENTITY PRIMARY KEY,

    InvoiceID BIGINT,

    ChargeName VARCHAR(100),

    ChargeAmount DECIMAL(18,2),

    GSTApplicable BIT,

    FOREIGN KEY(InvoiceID)
        REFERENCES InvoiceHeader(InvoiceID)
);