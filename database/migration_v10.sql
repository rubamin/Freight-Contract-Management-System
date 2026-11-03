/* =====================================================================
   migration_v10.sql - Per-user notifications and Contract contact person

   Run against FreightContractDB after migration_v9.sql. Safe to re-run.

   1) Notifications.UserID
      Every notification now belongs to one recipient, so a user only
      sees their own notifications. Rows created before this migration
      keep UserID = NULL and are visible to admins only (All users view).

   2) ContractMaster.ContactPerson
      Replaces Contract Number on the Add/Edit/View/List Contract pages.
      Existing contracts are filled from the vendor's contact person, or
      the vendor name when the vendor has none. ContractNo stays in the
      table and is generated automatically for new contracts.
   ===================================================================== */

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[Notifications]') AND name = 'UserID'
)
BEGIN
    ALTER TABLE [dbo].[Notifications] ADD [UserID] [int] NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK_Notifications_Users'
      AND parent_object_id = OBJECT_ID(N'[dbo].[Notifications]')
)
BEGIN
    ALTER TABLE [dbo].[Notifications] WITH CHECK ADD CONSTRAINT [FK_Notifications_Users]
        FOREIGN KEY([UserID]) REFERENCES [dbo].[Users] ([UserID]);
    ALTER TABLE [dbo].[Notifications] CHECK CONSTRAINT [FK_Notifications_Users];
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_Notifications_UserID_CreatedAt'
      AND object_id = OBJECT_ID(N'[dbo].[Notifications]')
)
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Notifications_UserID_CreatedAt]
        ON [dbo].[Notifications] ([UserID], [CreatedAt] DESC);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[ContractMaster]') AND name = 'ContactPerson'
)
BEGIN
    ALTER TABLE [dbo].[ContractMaster] ADD [ContactPerson] [nvarchar](200) NULL;
END
GO

UPDATE cm
SET cm.[ContactPerson] = COALESCE(NULLIF(LTRIM(RTRIM(v.[ContactPerson])), ''), v.[VendorName])
FROM [dbo].[ContractMaster] cm
INNER JOIN [dbo].[Vendors] v ON v.[VendorID] = cm.[VendorID]
WHERE cm.[ContactPerson] IS NULL OR LTRIM(RTRIM(cm.[ContactPerson])) = '';
GO
