/* =====================================================================
   migration_v12.sql - Contract types and type-specific invoice entry

   Run against FreightContractDB after migration_v11.sql. Safe to re-run.

   1) ContractMaster.ContractType
      FTL_TRIP, FTL_PMT, PTL_ZONE, PTL_DESTINATION or TANKER - decides
      which Excel template the contract was uploaded with. Contracts saved
      earlier stay NULL (old Rate Matrix format) until they are re-uploaded.

   2) InvoiceHeader.ContractType
      Type of invoice entry form the invoice was entered with.

   3) InvoiceItems - fields printed on transporter bills
      Party invoice no, consignee, material description and manifest no.
   ===================================================================== */

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ContractMaster]') AND name = 'ContractType')
BEGIN
    ALTER TABLE [dbo].[ContractMaster] ADD [ContractType] [varchar](30) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[InvoiceHeader]') AND name = 'ContractType')
BEGIN
    ALTER TABLE [dbo].[InvoiceHeader] ADD [ContractType] [varchar](30) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[InvoiceItems]') AND name = 'PartyInvoiceNo')
BEGIN
    ALTER TABLE [dbo].[InvoiceItems] ADD
        [PartyInvoiceNo] [varchar](100) NULL,
        [ConsigneeName] [nvarchar](200) NULL,
        [MaterialDescription] [nvarchar](200) NULL,
        [ManifestNo] [varchar](50) NULL;
END
GO
