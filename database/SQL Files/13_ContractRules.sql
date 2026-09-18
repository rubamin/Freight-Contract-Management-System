CREATE TABLE ContractRules
(
    RuleID INT IDENTITY PRIMARY KEY,

    ContractID INT,

    RuleName NVARCHAR(200),

    RuleValue NVARCHAR(MAX),

    FOREIGN KEY(ContractID)
    REFERENCES ContractMaster(ContractID)
);