CREATE TABLE AuditLogs
(
    AuditID BIGINT IDENTITY PRIMARY KEY,

    UserID INT,

    TableName NVARCHAR(200),

    RecordID INT,

    ActionType VARCHAR(50),

    OldData NVARCHAR(MAX),

    NewData NVARCHAR(MAX),

    IPAddress VARCHAR(100),

    ActionDate DATETIME DEFAULT GETDATE(),

    FOREIGN KEY(UserID)
    REFERENCES Users(UserID)
);