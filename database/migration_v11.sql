/* =====================================================================
   migration_v11.sql - Contract types (FTL Outbound / FTL Inbound /
   PTL Outbound / Part Load) for contracts and invoices

   Run against FreightContractDB after migration_v10.sql. Safe to re-run.

   1) ContractMaster.ContractType
      Existing contracts become FTL_OUTBOUND (the original layout).
   2) ContractRateMatrix
      BaseRate keeps 4 decimals (rates per KG such as 2.0430),
      plus DeliveryLocation and TransitDays for FTL Inbound rows.
   3) ContractCharges
      Docket slabs, ODA, FOV, minimum weight, detention etc. per contract.
   4) ContractZoneRates
      Part Load freight per zone and weight band.
   5) InvoiceHeader
      Contract type and the per-type charge columns used by Add Invoice.
   ===================================================================== */

/* ---------- 1) ContractMaster.ContractType ---------- */
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[ContractMaster]') AND name = 'ContractType'
)
BEGIN
    ALTER TABLE [dbo].[ContractMaster]
        ADD [ContractType] [nvarchar](30) NOT NULL
        CONSTRAINT [DF_ContractMaster_ContractType] DEFAULT ('FTL_OUTBOUND') WITH VALUES;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_ContractMaster_Vendor_Type_Status'
      AND object_id = OBJECT_ID(N'[dbo].[ContractMaster]')
)
BEGIN
    CREATE NONCLUSTERED INDEX [IX_ContractMaster_Vendor_Type_Status]
        ON [dbo].[ContractMaster] ([VendorID], [ContractType], [Status]);
END
GO

/* ---------- 2) ContractRateMatrix ---------- */
IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[ContractRateMatrix]') AND name = 'BaseRate' AND scale < 4
)
BEGIN
    ALTER TABLE [dbo].[ContractRateMatrix] ALTER COLUMN [BaseRate] [decimal](18, 4) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[ContractRateMatrix]') AND name = 'DeliveryLocation'
)
BEGIN
    ALTER TABLE [dbo].[ContractRateMatrix] ADD [DeliveryLocation] [nvarchar](200) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[ContractRateMatrix]') AND name = 'TransitDays'
)
BEGIN
    ALTER TABLE [dbo].[ContractRateMatrix] ADD [TransitDays] [int] NULL;
END
GO

/* ---------- 3) ContractCharges ---------- */
IF OBJECT_ID(N'[dbo].[ContractCharges]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ContractCharges](
        [ChargeID]      [int] IDENTITY(1,1) NOT NULL,
        [ContractID]    [int] NOT NULL,
        [ChargeCode]    [nvarchar](50) NOT NULL,
        [Category]      [nvarchar](20) NULL,
        [WeightFromKG]  [decimal](18, 2) NULL,
        [WeightToKG]    [decimal](18, 2) NULL,
        [Amount]        [decimal](18, 4) NOT NULL,
        [Remarks]       [nvarchar](500) NULL,
        CONSTRAINT [PK_ContractCharges] PRIMARY KEY CLUSTERED ([ChargeID] ASC),
        CONSTRAINT [FK_ContractCharges_ContractMaster] FOREIGN KEY ([ContractID])
            REFERENCES [dbo].[ContractMaster] ([ContractID]) ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX [IX_ContractCharges_Contract_Code]
        ON [dbo].[ContractCharges] ([ContractID], [ChargeCode]);
END
GO

/* ---------- 4) ContractZoneRates ---------- */
IF OBJECT_ID(N'[dbo].[ContractZoneRates]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ContractZoneRates](
        [ZoneRateID]    [int] IDENTITY(1,1) NOT NULL,
        [ContractID]    [int] NOT NULL,
        [ZoneCode]      [nvarchar](50) NOT NULL,
        [Coverage]      [nvarchar](1000) NOT NULL,
        [WeightFromKG]  [decimal](18, 2) NOT NULL,
        [WeightToKG]    [decimal](18, 2) NULL,
        [RatePerKG]     [decimal](18, 4) NOT NULL,
        CONSTRAINT [PK_ContractZoneRates] PRIMARY KEY CLUSTERED ([ZoneRateID] ASC),
        CONSTRAINT [FK_ContractZoneRates_ContractMaster] FOREIGN KEY ([ContractID])
            REFERENCES [dbo].[ContractMaster] ([ContractID]) ON DELETE CASCADE,
        CONSTRAINT [UQ_ContractZoneRates_Contract_Zone_Band] UNIQUE ([ContractID], [ZoneCode], [WeightFromKG])
    );
END
GO

/* ---------- 5) InvoiceHeader per-type columns ---------- */
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[InvoiceHeader]') AND name = 'ContractType')
    ALTER TABLE [dbo].[InvoiceHeader] ADD [ContractType] [nvarchar](30) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[InvoiceHeader]') AND name = 'Packages')
    ALTER TABLE [dbo].[InvoiceHeader] ADD [Packages] [int] NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[InvoiceHeader]') AND name = 'ChargedWeight')
    ALTER TABLE [dbo].[InvoiceHeader] ADD [ChargedWeight] [decimal](18, 2) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[InvoiceHeader]') AND name = 'BilledRate')
    ALTER TABLE [dbo].[InvoiceHeader] ADD [BilledRate] [decimal](18, 4) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[InvoiceHeader]') AND name = 'DocketCharges')
    ALTER TABLE [dbo].[InvoiceHeader] ADD [DocketCharges] [decimal](18, 2) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[InvoiceHeader]') AND name = 'ODACategory')
    ALTER TABLE [dbo].[InvoiceHeader] ADD [ODACategory] [nvarchar](5) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[InvoiceHeader]') AND name = 'ODACharges')
    ALTER TABLE [dbo].[InvoiceHeader] ADD [ODACharges] [decimal](18, 2) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[InvoiceHeader]') AND name = 'FOVCharges')
    ALTER TABLE [dbo].[InvoiceHeader] ADD [FOVCharges] [decimal](18, 2) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[InvoiceHeader]') AND name = 'LoadingCharges')
    ALTER TABLE [dbo].[InvoiceHeader] ADD [LoadingCharges] [decimal](18, 2) NULL;
GO

UPDATE [dbo].[InvoiceHeader] SET [ContractType] = 'FTL_OUTBOUND' WHERE [ContractType] IS NULL;
GO
