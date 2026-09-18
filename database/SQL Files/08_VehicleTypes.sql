CREATE TABLE VehicleTypes
(
    VehicleTypeID INT IDENTITY PRIMARY KEY,

    VehicleName NVARCHAR(100),

    Capacity DECIMAL(18,2),

    Unit VARCHAR(20),

    UNIQUE(VehicleName)
);