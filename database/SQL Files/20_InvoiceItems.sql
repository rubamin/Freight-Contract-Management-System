CREATE TABLE InvoiceItems
(
    InvoiceItemID BIGINT IDENTITY PRIMARY KEY,

    InvoiceID BIGINT NOT NULL,

    DestinationID INT,

    WeightID INT,

    ActualWeight DECIMAL(18,2),

    DistanceKM DECIMAL(18,2),

    Rate DECIMAL(18,2),

    FreightAmount DECIMAL(18,2),

    FOREIGN KEY(InvoiceID)
        REFERENCES InvoiceHeader(InvoiceID),

    FOREIGN KEY(DestinationID)
        REFERENCES DestinationMaster(DestinationID),

    FOREIGN KEY(WeightID)
        REFERENCES WeightMaster(WeightID)
);