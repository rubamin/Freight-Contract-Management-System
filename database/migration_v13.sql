/* =====================================================================
   migration_v13.sql - Customer / Supplier master, user remarks, drafts

   Run against FreightContractDB after migration_v12.sql. Safe to re-run:
   every change is guarded, and the one-time data moves only run in the
   same batch that adds their column.

   1) CustomerMaster.PartyType
      CUSTOMER or SUPPLIER. Inbound invoices pick a supplier, outbound
      invoices pick a customer. Existing rows become CUSTOMER.

   2) UserRemarks ("Remark by User") on every business module
      CustomerMaster, DestinationMaster, VehicleTypes, WeightMaster,
      Vendors, ContractMaster and InvoiceHeader. Editable by the user.

   3) Remarks (system generated, read-only) on the masters and Vendors
      ContractMaster and InvoiceHeader already have a Remarks column; it
      now holds system text only. Existing contract remarks were typed by
      users, so they move to UserRemarks. Existing invoice remarks were
      stored as "<user text> | Audit: <audit text>" and are split.

   4) InvoiceDrafts
      Saved Add Invoice pages (whole page or a single removed invoice).
      Draft attachments live on disk under server/draft_uploads/<DraftID>.
   ===================================================================== */

-- 1) CustomerMaster.PartyType -----------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[CustomerMaster]') AND name = 'PartyType')
BEGIN
    ALTER TABLE [dbo].[CustomerMaster]
        ADD [PartyType] [varchar](20) NOT NULL
        CONSTRAINT [DF_CustomerMaster_PartyType] DEFAULT ('CUSTOMER') WITH VALUES;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_CustomerMaster_PartyType')
BEGIN
    ALTER TABLE [dbo].[CustomerMaster]
        ADD CONSTRAINT [CK_CustomerMaster_PartyType] CHECK ([PartyType] IN ('CUSTOMER', 'SUPPLIER'));
END
GO

-- 2) + 3) Remarks columns on the masters and Vendors -------------------
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[CustomerMaster]') AND name = 'UserRemarks')
    ALTER TABLE [dbo].[CustomerMaster] ADD [UserRemarks] [nvarchar](1000) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[CustomerMaster]') AND name = 'Remarks')
    ALTER TABLE [dbo].[CustomerMaster] ADD [Remarks] [nvarchar](1000) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[DestinationMaster]') AND name = 'UserRemarks')
    ALTER TABLE [dbo].[DestinationMaster] ADD [UserRemarks] [nvarchar](1000) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[DestinationMaster]') AND name = 'Remarks')
    ALTER TABLE [dbo].[DestinationMaster] ADD [Remarks] [nvarchar](1000) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[VehicleTypes]') AND name = 'UserRemarks')
    ALTER TABLE [dbo].[VehicleTypes] ADD [UserRemarks] [nvarchar](1000) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[VehicleTypes]') AND name = 'Remarks')
    ALTER TABLE [dbo].[VehicleTypes] ADD [Remarks] [nvarchar](1000) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[WeightMaster]') AND name = 'UserRemarks')
    ALTER TABLE [dbo].[WeightMaster] ADD [UserRemarks] [nvarchar](1000) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[WeightMaster]') AND name = 'Remarks')
    ALTER TABLE [dbo].[WeightMaster] ADD [Remarks] [nvarchar](1000) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Vendors]') AND name = 'UserRemarks')
    ALTER TABLE [dbo].[Vendors] ADD [UserRemarks] [nvarchar](1000) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Vendors]') AND name = 'Remarks')
    ALTER TABLE [dbo].[Vendors] ADD [Remarks] [nvarchar](1000) NULL;
GO

-- ContractMaster: existing Remarks were typed by users -> UserRemarks.
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ContractMaster]') AND name = 'UserRemarks')
BEGIN
    ALTER TABLE [dbo].[ContractMaster] ADD [UserRemarks] [nvarchar](1000) NULL;
    EXEC(N'UPDATE [dbo].[ContractMaster]
           SET [UserRemarks] = LEFT([Remarks], 1000), [Remarks] = NULL
           WHERE [Remarks] IS NOT NULL AND LTRIM(RTRIM([Remarks])) <> ''''');
END
GO

-- InvoiceHeader: split "<user text> | Audit: <audit text>".
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[InvoiceHeader]') AND name = 'UserRemarks')
BEGIN
    ALTER TABLE [dbo].[InvoiceHeader] ADD [UserRemarks] [nvarchar](1000) NULL;
    EXEC(N'UPDATE [dbo].[InvoiceHeader]
           SET [UserRemarks] = LEFT(LEFT([Remarks], CHARINDEX('' | Audit: '', [Remarks]) - 1), 1000),
               [Remarks] = SUBSTRING([Remarks], CHARINDEX('' | Audit: '', [Remarks]) + 10, LEN([Remarks]))
           WHERE CHARINDEX('' | Audit: '', [Remarks]) > 0');
END
GO

-- 4) InvoiceDrafts ------------------------------------------------------
IF OBJECT_ID(N'[dbo].[InvoiceDrafts]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[InvoiceDrafts](
        [DraftID] [int] IDENTITY(1,1) NOT NULL,
        [UserID] [int] NOT NULL,
        [Title] [nvarchar](200) NULL,
        [ContractType] [varchar](30) NULL,
        [InvoiceCount] [int] NOT NULL CONSTRAINT [DF_InvoiceDrafts_InvoiceCount] DEFAULT (0),
        [Payload] [nvarchar](max) NOT NULL,
        [Files] [nvarchar](max) NULL,
        [CreatedAt] [datetime] NOT NULL CONSTRAINT [DF_InvoiceDrafts_CreatedAt] DEFAULT (GETDATE()),
        [UpdatedAt] [datetime] NULL,
        CONSTRAINT [PK_InvoiceDrafts] PRIMARY KEY CLUSTERED ([DraftID] ASC),
        CONSTRAINT [FK_InvoiceDrafts_Users] FOREIGN KEY ([UserID]) REFERENCES [dbo].[Users] ([UserID])
    );
    CREATE NONCLUSTERED INDEX [IX_InvoiceDrafts_UserID] ON [dbo].[InvoiceDrafts] ([UserID]);
END
GO
