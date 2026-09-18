CREATE TABLE InvoiceStatusHistory
(
    HistoryID BIGINT IDENTITY PRIMARY KEY,

    InvoiceID BIGINT,

    OldStatusID INT,

    NewStatusID INT,

    ChangedBy INT,

    ChangedDate DATETIME DEFAULT GETDATE(),

    Remarks NVARCHAR(MAX),

    FOREIGN KEY(InvoiceID)
        REFERENCES InvoiceHeader(InvoiceID),

    FOREIGN KEY(OldStatusID)
        REFERENCES StatusMaster(StatusID),

    FOREIGN KEY(NewStatusID)
        REFERENCES StatusMaster(StatusID),

    FOREIGN KEY(ChangedBy)
        REFERENCES Users(UserID)
);