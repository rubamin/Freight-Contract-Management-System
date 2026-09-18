/* =====================================================================
   migration_v3.sql — Fix Round 2

   Run this against the same FreightContractDB database that already has
   migration_v2.sql applied. Every step is written to be safely re-run
   (checked with IF EXISTS/IF NOT EXISTS) in case it's run more than once.
   ===================================================================== */

/* ---------------------------------------------------------------------
   1) ContractMaster.ContractNo: global unique -> composite (VendorID, ContractNo)
   Task item 4: two different vendors could never both use Contract No.
   "01" because ContractNo alone was globally unique. Drop that constraint
   and replace it with a composite unique index.
   --------------------------------------------------------------------- */
IF EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UQ_ContractMaster_ContractNo' AND object_id = OBJECT_ID(N'[dbo].[ContractMaster]')
)
BEGIN
    ALTER TABLE [dbo].[ContractMaster] DROP CONSTRAINT [UQ_ContractMaster_ContractNo];
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UQ_ContractMaster_Vendor_ContractNo' AND object_id = OBJECT_ID(N'[dbo].[ContractMaster]')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [UQ_ContractMaster_Vendor_ContractNo]
    ON [dbo].[ContractMaster] ([VendorID] ASC, [ContractNo] ASC);
END
GO

/* ---------------------------------------------------------------------
   2) DestinationMaster: simplify to City (District/State auto-filled),
      drop Pincode entirely
   Task item 7.
   --------------------------------------------------------------------- */
-- Sequelize auto-names composite unique indexes; drop by column signature
-- rather than assuming an exact name, in case migration_v2.sql created it
-- under a different generated name.
DECLARE @oldDestIndexName NVARCHAR(128);
SELECT @oldDestIndexName = i.name
FROM sys.indexes i
WHERE i.object_id = OBJECT_ID(N'[dbo].[DestinationMaster]')
  AND i.is_unique = 1
  AND EXISTS (
      SELECT 1 FROM sys.index_columns ic
      JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
      WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id AND c.name = 'Pincode'
  );

IF @oldDestIndexName IS NOT NULL
BEGIN
    EXEC('DROP INDEX [' + @oldDestIndexName + '] ON [dbo].[DestinationMaster]');
END
GO

IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[DestinationMaster]') AND name = 'Pincode'
)
BEGIN
    ALTER TABLE [dbo].[DestinationMaster] DROP COLUMN [Pincode];
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UQ_DestinationMaster_City_State' AND object_id = OBJECT_ID(N'[dbo].[DestinationMaster]')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [UQ_DestinationMaster_City_State]
    ON [dbo].[DestinationMaster] ([City] ASC, [State] ASC);
END
GO

/* ---------------------------------------------------------------------
   3) WeightMaster: FromWeight/ToWeight range -> single Weight value,
      WeightUnit defaults to 'MT'
   Task item 9. Existing data is carried over by copying FromWeight into
   the new Weight column before dropping FromWeight/ToWeight, so no
   existing weight-band rows are lost - each becomes a single-value row
   using its lower bound.
   --------------------------------------------------------------------- */
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[WeightMaster]') AND name = 'Weight'
)
BEGIN
    ALTER TABLE [dbo].[WeightMaster] ADD [Weight] [decimal](18, 2) NULL;
END
GO

UPDATE [dbo].[WeightMaster]
SET [Weight] = [FromWeight]
WHERE [Weight] IS NULL
  AND EXISTS (
      SELECT 1 FROM sys.columns
      WHERE object_id = OBJECT_ID(N'[dbo].[WeightMaster]') AND name = 'FromWeight'
  );
GO

IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[WeightMaster]') AND name = 'FromWeight'
)
BEGIN
    ALTER TABLE [dbo].[WeightMaster] DROP COLUMN [FromWeight];
END
GO

IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[WeightMaster]') AND name = 'ToWeight'
)
BEGIN
    ALTER TABLE [dbo].[WeightMaster] DROP COLUMN [ToWeight];
END
GO

-- Backfill any still-NULL Weight (e.g. rows with no prior FromWeight) to 0
-- so the column can be made NOT NULL to match the model.
UPDATE [dbo].[WeightMaster] SET [Weight] = 0 WHERE [Weight] IS NULL;
GO

ALTER TABLE [dbo].[WeightMaster] ALTER COLUMN [Weight] [decimal](18, 2) NOT NULL;
GO

-- WeightUnit now defaults to 'MT' (task item 9) and backfills any blank
-- existing rows to the same default.
UPDATE [dbo].[WeightMaster] SET [WeightUnit] = 'MT' WHERE [WeightUnit] IS NULL OR [WeightUnit] = '';
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.default_constraints dc
    JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
    WHERE dc.parent_object_id = OBJECT_ID(N'[dbo].[WeightMaster]') AND c.name = 'WeightUnit'
)
BEGIN
    ALTER TABLE [dbo].[WeightMaster] ADD CONSTRAINT [DF_WeightMaster_WeightUnit] DEFAULT ('MT') FOR [WeightUnit];
END
GO

ALTER TABLE [dbo].[WeightMaster] ALTER COLUMN [WeightUnit] [varchar](20) NOT NULL;
GO

/* ---------------------------------------------------------------------
   4) Create AccessRequest table
   Task item 19: generalized "Request Access" flow (any module permission
   or location), replacing the earlier location-only request path.
   --------------------------------------------------------------------- */
IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'AccessRequest'
)
BEGIN
    CREATE TABLE [dbo].[AccessRequest](
        [AccessRequestID] [int] IDENTITY(1,1) NOT NULL,
        [UserID] [int] NOT NULL,
        [RequestType] [varchar](20) NOT NULL,
        [ModuleKey] [varchar](50) NULL,
        [RequestedAction] [varchar](10) NULL,
        [PlantID] [int] NULL,
        [Status] [varchar](20) NOT NULL DEFAULT ('PENDING'),
        [RequestedAt] [datetime] NULL DEFAULT (getdate()),
        [ResolvedBy] [int] NULL,
        [ResolvedAt] [datetime] NULL,
    PRIMARY KEY CLUSTERED
    (
        [AccessRequestID] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY]

    ALTER TABLE [dbo].[AccessRequest] WITH CHECK ADD CONSTRAINT [FK_AccessRequest_Users]
        FOREIGN KEY([UserID]) REFERENCES [dbo].[Users] ([UserID])
    ALTER TABLE [dbo].[AccessRequest] CHECK CONSTRAINT [FK_AccessRequest_Users]

    ALTER TABLE [dbo].[AccessRequest] WITH CHECK ADD CONSTRAINT [FK_AccessRequest_Plants]
        FOREIGN KEY([PlantID]) REFERENCES [dbo].[Plants] ([PlantID])
    ALTER TABLE [dbo].[AccessRequest] CHECK CONSTRAINT [FK_AccessRequest_Plants]
END
GO
