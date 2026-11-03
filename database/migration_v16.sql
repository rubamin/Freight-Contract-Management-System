/* =====================================================================
   migration_v16.sql - Master approval workflow, location-level access

   Run against FreightContractDB after migration_v15.sql. Safe to re-run:
   every change is guarded, and the one-time data moves only run in the
   same batch that adds their column.

   1) MasterApprovalSettings
      One row per master (vendors, contracts, destinations, weights,
      vehicle-types, customers). Whether an Add and / or an Edit of that
      master waits for approval. SameApprovers = the admin chose one
      approver list for both actions.

   2) MasterApprovalApprovers
      Users who may approve an Add (ActionType ADD) or an Edit (EDIT) of a
      master. Any one of them can approve. UserID is named UserID so the
      User Master delete clears it like every other user child table.

   3) MasterChangeRequests
      An Add / Edit / bulk upload held for approval. Payload keeps the
      submitted data, OldData the record as it was when the edit was
      requested. A contract rate matrix file is kept on disk under
      server/master_request_uploads/<RequestID> until the request is
      decided.
        Status   PENDING | APPROVED | REJECTED | CANCELLED

   4) UserLocationPermission.UpdatedAt + location-level Add / Edit
      Invoices are now added / edited only for locations where the user
      has Add / Edit (User Master > Settings & Hierarchy Access). So that
      no existing user loses access:
        - every legacy Plants grant becomes a grant on the Plant's
          hierarchy Location
        - every location grant gets Add / Edit from the user's Invoices
          module permission
   ===================================================================== */

-- 1) Settings ---------------------------------------------------------------
IF OBJECT_ID(N'[dbo].[MasterApprovalSettings]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[MasterApprovalSettings](
        [ModuleKey] [varchar](50) NOT NULL,
        [AddEnabled] [bit] NOT NULL CONSTRAINT [DF_MasterApprovalSettings_AddEnabled] DEFAULT (0),
        [EditEnabled] [bit] NOT NULL CONSTRAINT [DF_MasterApprovalSettings_EditEnabled] DEFAULT (0),
        [SameApprovers] [bit] NOT NULL CONSTRAINT [DF_MasterApprovalSettings_SameApprovers] DEFAULT (1),
        [UpdatedAt] [datetime] NOT NULL CONSTRAINT [DF_MasterApprovalSettings_UpdatedAt] DEFAULT (GETDATE()),
        [UpdatedBy] [int] NULL,
        CONSTRAINT [PK_MasterApprovalSettings] PRIMARY KEY CLUSTERED ([ModuleKey] ASC)
    );
END
GO

-- 2) Approvers --------------------------------------------------------------
IF OBJECT_ID(N'[dbo].[MasterApprovalApprovers]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[MasterApprovalApprovers](
        [MasterApproverID] [int] IDENTITY(1,1) NOT NULL,
        [ModuleKey] [varchar](50) NOT NULL,
        [ActionType] [varchar](10) NOT NULL,
        [UserID] [int] NOT NULL,
        CONSTRAINT [PK_MasterApprovalApprovers] PRIMARY KEY CLUSTERED ([MasterApproverID] ASC),
        CONSTRAINT [FK_MasterApprovalApprovers_Users] FOREIGN KEY ([UserID]) REFERENCES [dbo].[Users] ([UserID]),
        CONSTRAINT [UQ_MasterApprovalApprovers] UNIQUE ([ModuleKey], [ActionType], [UserID]),
        CONSTRAINT [CK_MasterApprovalApprovers_ActionType] CHECK ([ActionType] IN ('ADD', 'EDIT'))
    );
    CREATE NONCLUSTERED INDEX [IX_MasterApprovalApprovers_UserID] ON [dbo].[MasterApprovalApprovers] ([UserID]);
END
GO

-- 3) Requests ---------------------------------------------------------------
IF OBJECT_ID(N'[dbo].[MasterChangeRequests]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[MasterChangeRequests](
        [RequestID] [int] IDENTITY(1,1) NOT NULL,
        [ModuleKey] [varchar](50) NOT NULL,
        [ActionType] [varchar](10) NOT NULL,
        [Operation] [varchar](10) NOT NULL CONSTRAINT [DF_MasterChangeRequests_Operation] DEFAULT ('SINGLE'),
        [RecordID] [int] NULL,
        [RecordLabel] [nvarchar](300) NULL,
        [Payload] [nvarchar](max) NOT NULL,
        [OldData] [nvarchar](max) NULL,
        [FileName] [nvarchar](260) NULL,
        [FilePath] [nvarchar](500) NULL,
        [Status] [varchar](20) NOT NULL CONSTRAINT [DF_MasterChangeRequests_Status] DEFAULT ('PENDING'),
        [RequestedBy] [int] NOT NULL,
        [RequestedAt] [datetime] NOT NULL CONSTRAINT [DF_MasterChangeRequests_RequestedAt] DEFAULT (GETDATE()),
        [ActedBy] [int] NULL,
        [ActedAt] [datetime] NULL,
        [ActionRemarks] [nvarchar](1000) NULL,
        [ResultRecordID] [int] NULL,
        [ResultMessage] [nvarchar](1000) NULL,
        CONSTRAINT [PK_MasterChangeRequests] PRIMARY KEY CLUSTERED ([RequestID] ASC),
        CONSTRAINT [FK_MasterChangeRequests_RequestedBy] FOREIGN KEY ([RequestedBy]) REFERENCES [dbo].[Users] ([UserID]),
        CONSTRAINT [FK_MasterChangeRequests_ActedBy] FOREIGN KEY ([ActedBy]) REFERENCES [dbo].[Users] ([UserID]),
        CONSTRAINT [CK_MasterChangeRequests_ActionType] CHECK ([ActionType] IN ('ADD', 'EDIT')),
        CONSTRAINT [CK_MasterChangeRequests_Operation] CHECK ([Operation] IN ('SINGLE', 'BULK')),
        CONSTRAINT [CK_MasterChangeRequests_Status] CHECK ([Status] IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'))
    );
    CREATE NONCLUSTERED INDEX [IX_MasterChangeRequests_Status] ON [dbo].[MasterChangeRequests] ([Status], [ModuleKey], [ActionType]);
    CREATE NONCLUSTERED INDEX [IX_MasterChangeRequests_RequestedBy] ON [dbo].[MasterChangeRequests] ([RequestedBy]);
    CREATE NONCLUSTERED INDEX [IX_MasterChangeRequests_Record] ON [dbo].[MasterChangeRequests] ([ModuleKey], [RecordID], [Status]);
END
GO

-- 4) Location-level Add / Edit ---------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[UserLocationPermission]') AND name = 'UpdatedAt')
BEGIN
    ALTER TABLE [dbo].[UserLocationPermission] ADD [UpdatedAt] [datetime] NULL;

    -- Legacy Plants grants -> grants on the Plant's hierarchy Location.
    EXEC(N'
    INSERT INTO [dbo].[UserLocationPermission] ([UserID], [PlantID], [LocationID], [CanView], [CanAdd], [CanEdit])
    SELECT DISTINCT p.[UserID], NULL, pl.[LocationID], 1, 0, 0
      FROM [dbo].[UserLocationPermission] p
      JOIN [dbo].[Plants] pl ON pl.[PlantID] = p.[PlantID]
     WHERE p.[PlantID] IS NOT NULL
       AND p.[CanView] = 1
       AND pl.[LocationID] IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM [dbo].[UserLocationPermission] x
                        WHERE x.[UserID] = p.[UserID] AND x.[LocationID] = pl.[LocationID]);
    ');

    -- Add / Edit on every granted location from the Invoices permission.
    EXEC(N'
    UPDATE p
       SET p.[CanView] = 1,
           p.[CanAdd] = CASE WHEN m.[CanAdd] = 1 THEN 1 ELSE p.[CanAdd] END,
           p.[CanEdit] = CASE WHEN m.[CanEdit] = 1 THEN 1 ELSE p.[CanEdit] END,
           p.[UpdatedAt] = GETDATE()
      FROM [dbo].[UserLocationPermission] p
      JOIN [dbo].[UserModulePermission] m ON m.[UserID] = p.[UserID] AND m.[ModuleKey] = ''invoices''
     WHERE p.[CanView] = 1;
    ');
END
GO
