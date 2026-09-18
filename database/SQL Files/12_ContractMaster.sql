CREATE TABLE ContractMaster

(
    ContractID INT IDENTITY PRIMARY KEY,

    ContractNo VARCHAR(100) UNIQUE,

    VendorID INT,

    VendorPAN VARCHAR(20),

    ContractStartDate DATE,

    ContractEndDate DATE,

    DieselBasePrice DECIMAL(18,2),

    DieselRevision VARCHAR(100),

    StatusID INT,

    Status VARCHAR(30),

    Remarks NVARCHAR(MAX),

    RateMatrixFileName VARCHAR(255),

    CreatedBy INT,

    UpdatedBy INT,

    CreatedAt DATETIME DEFAULT GETDATE(),

    UpdatedAt DATETIME,

    FOREIGN KEY(VendorID)
    REFERENCES Vendors(VendorID),

    FOREIGN KEY(StatusID)
    REFERENCES StatusMaster(StatusID),

    FOREIGN KEY(CreatedBy)
    REFERENCES Users(UserID),

    FOREIGN KEY(UpdatedBy)
    REFERENCES Users(UserID)
);
