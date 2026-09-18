CREATE TABLE RolePermissions
(
    RolePermissionID INT IDENTITY PRIMARY KEY,
    RoleID INT,
    PermissionID INT,
    FOREIGN KEY(RoleID)
    REFERENCES Roles(RoleID),
    FOREIGN KEY(PermissionID)
    REFERENCES Permissions(PermissionID),
    UNIQUE(RoleID,PermissionID)
);