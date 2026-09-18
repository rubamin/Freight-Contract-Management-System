CREATE TABLE ContractRateMatrix
(
    RateID INT IDENTITY PRIMARY KEY,

    ContractID INT,

    DestinationID INT,

    VehicleTypeID INT,

    BaseRate DECIMAL(18,2),

    EffectiveFrom DATE,

    EffectiveTo DATE,

    FOREIGN KEY(ContractID)
    REFERENCES ContractMaster(ContractID),

    FOREIGN KEY(DestinationID)
    REFERENCES DestinationMaster(DestinationID),

    FOREIGN KEY(VehicleTypeID)
    REFERENCES VehicleTypes(VehicleTypeID),

);