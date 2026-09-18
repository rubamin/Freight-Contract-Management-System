CREATE TABLE Plants
(
    PlantID INT IDENTITY PRIMARY KEY,

    PlantCode VARCHAR(20) UNIQUE,

    PlantName NVARCHAR(200),

    City NVARCHAR(100),

    State NVARCHAR(100),

    IsActive BIT DEFAULT 1
);