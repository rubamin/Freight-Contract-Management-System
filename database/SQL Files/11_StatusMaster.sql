CREATE TABLE StatusMaster
(
    StatusID INT IDENTITY PRIMARY KEY,

    StatusName NVARCHAR(100),

    ModuleName NVARCHAR(100),

    UNIQUE(StatusName,ModuleName)
);