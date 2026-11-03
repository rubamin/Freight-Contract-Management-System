/* =====================================================================
   migration_v15.sql - SO Number, Edit Invoice drafts, draft sharing

   Run against FreightContractDB after migration_v14.sql. Safe to re-run:
   every change is guarded.

   1) InvoiceHeader.SONumber
      Sales Order number of one trip row (optional).

   2) InvoiceDrafts
      DraftType     ADD  - a saved Add Invoice page (existing drafts)
                    EDIT - unsaved changes of existing invoices from the
                           Edit Invoice page; nothing is audited or sent
                           for approval until the user saves the changes
      LastEditedBy  user who saved the draft last (owner or a shared user)

   3) InvoiceDraftShares
      Users a draft is shared with. A shared user can open, edit, save and
      submit the draft; the comment is mailed to them when it is shared.
      UserID is the user the draft is shared with (named UserID so the
      User Master delete clears it like every other user child table).
   ===================================================================== */

-- 1) SO Number ------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[InvoiceHeader]') AND name = 'SONumber')
    ALTER TABLE [dbo].[InvoiceHeader] ADD [SONumber] [nvarchar](50) NULL;
GO

-- 2) Draft type, last editor -------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[InvoiceDrafts]') AND name = 'DraftType')
    ALTER TABLE [dbo].[InvoiceDrafts] ADD [DraftType] [varchar](10) NOT NULL
        CONSTRAINT [DF_InvoiceDrafts_DraftType] DEFAULT ('ADD');
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_InvoiceDrafts_DraftType')
    ALTER TABLE [dbo].[InvoiceDrafts] ADD CONSTRAINT [CK_InvoiceDrafts_DraftType] CHECK ([DraftType] IN ('ADD', 'EDIT'));
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[InvoiceDrafts]') AND name = 'LastEditedBy')
    ALTER TABLE [dbo].[InvoiceDrafts] ADD [LastEditedBy] [int] NULL;
GO

-- 3) Draft shares ------------------------------------------------------------
IF OBJECT_ID(N'[dbo].[InvoiceDraftShares]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[InvoiceDraftShares](
        [ShareID] [int] IDENTITY(1,1) NOT NULL,
        [DraftID] [int] NOT NULL,
        [UserID] [int] NOT NULL,
        [SharedByUserID] [int] NOT NULL,
        [Comment] [nvarchar](1000) NULL,
        [SharedAt] [datetime] NOT NULL CONSTRAINT [DF_InvoiceDraftShares_SharedAt] DEFAULT (GETDATE()),
        CONSTRAINT [PK_InvoiceDraftShares] PRIMARY KEY CLUSTERED ([ShareID] ASC),
        CONSTRAINT [FK_InvoiceDraftShares_InvoiceDrafts] FOREIGN KEY ([DraftID]) REFERENCES [dbo].[InvoiceDrafts] ([DraftID]) ON DELETE CASCADE,
        CONSTRAINT [FK_InvoiceDraftShares_Users] FOREIGN KEY ([UserID]) REFERENCES [dbo].[Users] ([UserID]),
        CONSTRAINT [UQ_InvoiceDraftShares_Draft_User] UNIQUE ([DraftID], [UserID])
    );
    CREATE NONCLUSTERED INDEX [IX_InvoiceDraftShares_UserID] ON [dbo].[InvoiceDraftShares] ([UserID]);
END
GO
