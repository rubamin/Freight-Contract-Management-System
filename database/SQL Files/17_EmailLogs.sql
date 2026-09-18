CREATE TABLE EmailLogs
(
    EmailLogID BIGINT IDENTITY PRIMARY KEY,

    RecipientEmail NVARCHAR(200),

    Subject NVARCHAR(500),

    EmailBody NVARCHAR(MAX),

    Status VARCHAR(50),

    ErrorMessage NVARCHAR(MAX),

    SentAt DATETIME DEFAULT GETDATE()
);