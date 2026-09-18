CREATE INDEX IX_ContractMasterVendor
ON ContractMaster(VendorID);

CREATE INDEX IX_ContractMasterStatus
ON ContractMaster(StatusID);

CREATE INDEX IX_ContractRateMatrixDestination
ON ContractRateMatrix(DestinationID);

CREATE INDEX IX_ContractRateMatrixVehicle
ON ContractRateMatrix(VehicleTypeID);


CREATE INDEX IX_AuditLogsUser
ON AuditLogs(UserID);

CREATE INDEX IX_EmailLogsStatus
ON EmailLogs(Status);