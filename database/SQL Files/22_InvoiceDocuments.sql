CREATE TABLE InvoiceDocuments
(
    DocumentID BIGINT IDENTITY PRIMARY KEY,

    InvoiceID BIGINT,

    FileName NVARCHAR(500),

    OriginalFileName NVARCHAR(500),

    FileType VARCHAR(20),

    FilePath NVARCHAR(1000),

    UploadedDate DATETIME DEFAULT GETDATE(),

    FOREIGN KEY(InvoiceID)
        REFERENCES InvoiceHeader(InvoiceID)
);