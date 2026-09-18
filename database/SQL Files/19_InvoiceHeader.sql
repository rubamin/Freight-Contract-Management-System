CREATE TABLE InvoiceHeader
(
    InvoiceID BIGINT IDENTITY PRIMARY KEY,

    InvoiceNumber VARCHAR(100) NOT NULL,

    InvoiceDate DATE NOT NULL,

    VendorID INT NOT NULL,

    VendorGSTID INT NULL,

    PlantID INT NOT NULL,

    ContractID INT NULL,

    LRNumber VARCHAR(100),

    LRDate DATE,

    VehicleNumber VARCHAR(30),

    VehicleTypeID INT,

    TotalWeight DECIMAL(18,2),

    DistanceKM DECIMAL(18,2),

    BasicFreight DECIMAL(18,2),

    OtherCharges DECIMAL(18,2),

    GSTAmount DECIMAL(18,2),

    TotalInvoiceAmount DECIMAL(18,2),

    InvoiceStatusID INT,

    UploadedBy INT,

    UploadedDate DATETIME DEFAULT GETDATE(),

    FOREIGN KEY(VendorID) REFERENCES Vendors(VendorID),
    FOREIGN KEY(VendorGSTID) REFERENCES VendorGST(VendorGSTID),
    FOREIGN KEY(PlantID) REFERENCES Plants(PlantID),
    FOREIGN KEY(ContractID) REFERENCES ContractMaster(ContractID),
    FOREIGN KEY(VehicleTypeID) REFERENCES VehicleTypes(VehicleTypeID),
    FOREIGN KEY(InvoiceStatusID) REFERENCES StatusMaster(StatusID),
    FOREIGN KEY(UploadedBy) REFERENCES Users(UserID)
);