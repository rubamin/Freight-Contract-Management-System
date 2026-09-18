CREATE TABLE VerificationErrors
(
    ErrorID BIGINT IDENTITY PRIMARY KEY,

    VerificationID BIGINT,

    ErrorType VARCHAR(100),

    FieldName VARCHAR(100),

    ExpectedValue NVARCHAR(MAX),

    ActualValue NVARCHAR(MAX),

    Remarks NVARCHAR(MAX),

    FOREIGN KEY(VerificationID)
        REFERENCES InvoiceVerification(VerificationID)
);