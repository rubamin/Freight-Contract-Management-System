CREATE TABLE DestinationMaster
(
    DestinationID INT IDENTITY PRIMARY KEY,

    City NVARCHAR(200),

    District NVARCHAR(200),

    State NVARCHAR(200),

    Pincode VARCHAR(10),

    UNIQUE(City,State,Pincode)
);