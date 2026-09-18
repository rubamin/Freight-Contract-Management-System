CREATE TABLE ContractDestinations
(
    ContractDestinationID INT IDENTITY PRIMARY KEY,

    ContractID INT,

    DestinationID INT,

    FOREIGN KEY(ContractID)
    REFERENCES ContractMaster(ContractID),

    FOREIGN KEY(DestinationID)
    REFERENCES DestinationMaster(DestinationID),

    UNIQUE(ContractID,DestinationID)
);