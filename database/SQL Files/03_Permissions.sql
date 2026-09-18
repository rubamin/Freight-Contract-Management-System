CREATE TABLE Permissions
(
    PermissionID INT IDENTITY PRIMARY KEY,
    PermissionName NVARCHAR(200) UNIQUE,
    ModuleName NVARCHAR(100)
);