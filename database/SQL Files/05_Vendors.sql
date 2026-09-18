CREATE TABLE Vendors
(
    VendorID INT IDENTITY PRIMARY KEY,
    VendorCode VARCHAR(30) UNIQUE,
    VendorName NVARCHAR(300),
    Address NVARCHAR(MAX),
    ContactPerson NVARCHAR(200),
    Email NVARCHAR(200),
    MobileNo VARCHAR(20),
    PANNo VARCHAR(20),
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE()
);