CREATE TABLE WeightMaster
(
    WeightID INT IDENTITY PRIMARY KEY,

    FromWeight DECIMAL(18,2),

    ToWeight DECIMAL(18,2),

    WeightUnit VARCHAR(20),

    UNIQUE(FromWeight,ToWeight)
);