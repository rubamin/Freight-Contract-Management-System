CREATE TABLE VendorGST
(
    VendorGSTID INT IDENTITY PRIMARY KEY,
    VendorID INT,
    GSTNumber VARCHAR(30),
    StateName NVARCHAR(100),
    IsDefault BIT DEFAULT 0,
    FOREIGN KEY(VendorID)
    REFERENCES Vendors(VendorID),
    UNIQUE(VendorID,GSTNumber)
);