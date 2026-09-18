CREATE TABLE InvoiceVerification
(
    VerificationID BIGINT IDENTITY PRIMARY KEY,

    InvoiceID BIGINT,

    ContractID INT,

    ExpectedAmount DECIMAL(18,2),

    InvoiceAmount DECIMAL(18,2),

    DifferenceAmount DECIMAL(18,2),

    VerificationStatus VARCHAR(50),

    VerifiedBy INT,

    VerifiedDate DATETIME,

    FOREIGN KEY(InvoiceID)
        REFERENCES InvoiceHeader(InvoiceID),

    FOREIGN KEY(ContractID)
        REFERENCES ContractMaster(ContractID),

    FOREIGN KEY(VerifiedBy)
        REFERENCES Users(UserID)
);