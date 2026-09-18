CREATE TABLE InvoiceApprovalHistory
(
    ApprovalID BIGINT IDENTITY PRIMARY KEY,

    InvoiceID BIGINT,

    ApprovedBy INT,

    StatusID INT,

    Remarks NVARCHAR(MAX),

    ApprovedDate DATETIME DEFAULT GETDATE(),

    FOREIGN KEY(InvoiceID)
        REFERENCES InvoiceHeader(InvoiceID),

    FOREIGN KEY(ApprovedBy)
        REFERENCES Users(UserID),

    FOREIGN KEY(StatusID)
        REFERENCES StatusMaster(StatusID)
);