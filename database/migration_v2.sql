/* =====================================================================
   FreightContractDB — Migration v2
   =====================================================================
   Consolidates every schema change made across the v2 feature/bugfix
   tasks into one script. Safe to run multiple times: every change is
   guarded with an existence check, so re-running this script on a
   database that already has some or all of these changes applied will
   not error out or duplicate anything.

   Run this against the EXISTING FreightContractDB database in SQL
   Server Management Studio, top to bottom, before starting the updated
   server application.

   IMPORTANT: Back up the database before running this script in
   production.
   ===================================================================== */

USE [FreightContractDB]
GO

/* ---------------------------------------------------------------------
   1) Add InvoiceHeader.LocationName
   Task: "Add LocationName column to InvoiceHeader, populated from the
   resolved Plant's name at invoice-upload time (server-side), instead
   of relying on the frontend-selected hierarchy location."
   --------------------------------------------------------------------- */
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[InvoiceHeader]') AND name = 'LocationName'
)
BEGIN
    ALTER TABLE [dbo].[InvoiceHeader] ADD [LocationName] VARCHAR(200) NULL;
END
GO

/* ---------------------------------------------------------------------
   1a) One-time backfill for InvoiceHeader.LocationName
   Task: same as above. Originally shipped as a standalone Node.js
   script (server/scripts/backfillLocationName.js); converted to plain
   SQL here and the Node script has been deleted from the codebase.
   Safe to re-run: only touches rows where LocationName is still NULL.
   --------------------------------------------------------------------- */
UPDATE ih
SET ih.LocationName = p.PlantName
FROM [dbo].[InvoiceHeader] ih
INNER JOIN [dbo].[Plants] p ON p.PlantID = ih.PlantID
WHERE ih.LocationName IS NULL;
GO

/* ---------------------------------------------------------------------
   2) Drop InvoiceHeader.VehicleNumber
   Task: "Remove the VehicleNumber field from the system entirely"
   --------------------------------------------------------------------- */
IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[InvoiceHeader]') AND name = 'VehicleNumber'
)
BEGIN
    ALTER TABLE [dbo].[InvoiceHeader] DROP COLUMN [VehicleNumber];
END
GO

/* ---------------------------------------------------------------------
   3) Add Users.ProfilePhotoUrl
   Task: "Build a Profile page — display/edit user's name, email, role,
   profile photo"
   --------------------------------------------------------------------- */
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND name = 'ProfilePhotoUrl'
)
BEGIN
    ALTER TABLE [dbo].[Users] ADD [ProfilePhotoUrl] NVARCHAR(500) NULL;
END
GO

/* ---------------------------------------------------------------------
   4) Create UserPreferences table
   Task: "Build a Settings page — notification preferences, default
   location/plant preference, saved per user"
   --------------------------------------------------------------------- */
IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'UserPreferences' AND schema_id = SCHEMA_ID('dbo')
)
BEGIN
    CREATE TABLE [dbo].[UserPreferences] (
        [UserID] [int] NOT NULL PRIMARY KEY,
        [NotificationEmailEnabled] [bit] NOT NULL DEFAULT (1),
        [NotificationSoundEnabled] [bit] NOT NULL DEFAULT (1),
        [DefaultPlantID] [int] NULL,
        [UpdatedAt] [datetime] NULL DEFAULT (getdate()),
        CONSTRAINT [FK_UserPreferences_Users] FOREIGN KEY ([UserID])
            REFERENCES [dbo].[Users]([UserID]),
        CONSTRAINT [FK_UserPreferences_Plants] FOREIGN KEY ([DefaultPlantID])
            REFERENCES [dbo].[Plants]([PlantID])
    );
END
GO

/* ---------------------------------------------------------------------
   5) Create Notifications table
   Task: "Notifications with sound — notification bell with unread-count
   badge, triggered on new invoice / discrepancy / email sent"
   --------------------------------------------------------------------- */
IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'Notifications' AND schema_id = SCHEMA_ID('dbo')
)
BEGIN
    CREATE TABLE [dbo].[Notifications] (
        [NotificationID] [bigint] IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Type] [varchar](50) NOT NULL,
        [Message] [varchar](500) NOT NULL,
        [RelatedInvoiceID] [bigint] NULL,
        [CreatedAt] [datetime] NULL DEFAULT (getdate()),
        CONSTRAINT [FK_Notifications_InvoiceHeader] FOREIGN KEY ([RelatedInvoiceID])
            REFERENCES [dbo].[InvoiceHeader]([InvoiceID])
    );
END
GO

/* ---------------------------------------------------------------------
   6) Add Users.PasswordResetTokenHash / PasswordResetExpiresAt
   Task: "Implement or fix the Forgot Password page layout and flow so
   users can properly request password resets." Stores a hashed
   (never plaintext) copy of the currently-issued reset token plus its
   expiry, so a reset link can be verified and single-use enforced.
   --------------------------------------------------------------------- */
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND name = 'PasswordResetTokenHash'
)
BEGIN
    ALTER TABLE [dbo].[Users] ADD [PasswordResetTokenHash] [varchar](255) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND name = 'PasswordResetExpiresAt'
)
BEGIN
    ALTER TABLE [dbo].[Users] ADD [PasswordResetExpiresAt] [datetime] NULL;
END
GO

/* ---------------------------------------------------------------------
   7) Add InvoiceHeader.IsPreApproved
   Task: "Invoices with a 'pre-approved' selection correctly display the
   status as Pre-Approved." The Add/Edit Invoice grid's "Pre-Appr"
   checkbox was previously never persisted anywhere, so every invoice
   silently reverted to "No" on reload regardless of what the uploader
   selected. This column is the actual, permanent storage for that flag.
   --------------------------------------------------------------------- */
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[InvoiceHeader]') AND name = 'IsPreApproved'
)
BEGIN
    ALTER TABLE [dbo].[InvoiceHeader] ADD [IsPreApproved] [bit] NOT NULL DEFAULT (0);
END
GO

/* ---------------------------------------------------------------------
   8) Create InvoiceApprovalHistory table
   Bug: the InvoiceApprovalHistory Sequelize model (and every dashboard/
   workflow query that joins to it) existed in code with no matching table
   ever created in the database, causing "Invalid object name
   'InvoiceApprovalHistory'" and 500s on GET /api/dashboard/summary and
   the approve/reject workflow.

   Data-model cleanup (see task item 10): server/services/workflow.service.js
   also referenced a second, never-defined "InvoiceStatusHistory" table for
   the exact same purpose (recording an invoice's old/new status on every
   approval action) - since no such model or table existed, that reference
   was dead code that would throw as soon as it ran. Rather than create two
   overlapping status-history tables, InvoiceStatusHistory's two extra
   columns (OldStatusID, NewStatusID) are folded into this single canonical
   table: StatusID below serves as NewStatusID, and OldStatusID is added
   alongside it. workflow.service.js has been updated to write only to
   this table.
   --------------------------------------------------------------------- */
IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'InvoiceApprovalHistory'
)
BEGIN
    CREATE TABLE [dbo].[InvoiceApprovalHistory](
        [ApprovalID] [bigint] IDENTITY(1,1) NOT NULL,
        [InvoiceID] [bigint] NULL,
        [OldStatusID] [int] NULL,
        [StatusID] [int] NULL,
        [ApprovedBy] [int] NULL,
        [Remarks] [nvarchar](max) NULL,
        [ApprovedDate] [datetime] NULL DEFAULT (getdate()),
    PRIMARY KEY CLUSTERED
    (
        [ApprovalID] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY]

    ALTER TABLE [dbo].[InvoiceApprovalHistory] WITH CHECK ADD CONSTRAINT [FK_InvoiceApprovalHistory_InvoiceHeader]
        FOREIGN KEY([InvoiceID]) REFERENCES [dbo].[InvoiceHeader] ([InvoiceID])
    ALTER TABLE [dbo].[InvoiceApprovalHistory] CHECK CONSTRAINT [FK_InvoiceApprovalHistory_InvoiceHeader]
END
GO

/* ---------------------------------------------------------------------
   9) Create CustomerMaster table
   Task item 6: new Customer Master module. Invoice.CustomerName remains a
   free-text column on InvoiceHeader (unchanged, so existing invoice rows
   are not affected) - CustomerMaster is the source list for the Add
   Invoice "Customer Name" dropdown and its inline "+ Add Customer"
   action, the same pattern already used for destination/city options
   sourced from DestinationMaster.
   --------------------------------------------------------------------- */
IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'CustomerMaster'
)
BEGIN
    CREATE TABLE [dbo].[CustomerMaster](
        [CustomerID] [int] IDENTITY(1,1) NOT NULL,
        [CustomerName] [nvarchar](300) NOT NULL,
        [ContactPerson] [nvarchar](200) NULL,
        [Email] [nvarchar](200) NULL,
        [Phone] [varchar](20) NULL,
        [Address] [nvarchar](max) NULL,
        [IsActive] [bit] NOT NULL DEFAULT (1),
        [CreatedAt] [datetime] NULL DEFAULT (getdate()),
    PRIMARY KEY CLUSTERED
    (
        [CustomerID] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY]
END
GO

/* ---------------------------------------------------------------------
   10) Create UserModulePermission and UserLocationPermission tables
   Task item 4/5: per-user, per-master View/Add/Edit permissions, plus
   which plants/locations a user may pick as their default plant. The
   existing RolePermissions table (server/models/RolePermission.js) is
   referenced by code but has no matching Permission master and no
   CREATE TABLE statement anywhere in this project's schema history (see
   the NOTE already in schema_full.sql) - rather than build on that
   incomplete, table-less system, permissions are modeled per-user
   directly here. RolePermission is left in place for backward
   compatibility but should be considered superseded; see CHANGELOG.
   --------------------------------------------------------------------- */
IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'UserModulePermission'
)
BEGIN
    CREATE TABLE [dbo].[UserModulePermission](
        [UserModulePermissionID] [int] IDENTITY(1,1) NOT NULL,
        [UserID] [int] NOT NULL,
        [ModuleKey] [varchar](50) NOT NULL,
        [CanView] [bit] NOT NULL DEFAULT (0),
        [CanAdd] [bit] NOT NULL DEFAULT (0),
        [CanEdit] [bit] NOT NULL DEFAULT (0),
    PRIMARY KEY CLUSTERED
    (
        [UserModulePermissionID] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
    CONSTRAINT [UQ_UserModulePermission_UserModule] UNIQUE ([UserID], [ModuleKey])
    ) ON [PRIMARY]

    ALTER TABLE [dbo].[UserModulePermission] WITH CHECK ADD CONSTRAINT [FK_UserModulePermission_Users]
        FOREIGN KEY([UserID]) REFERENCES [dbo].[Users] ([UserID])
    ALTER TABLE [dbo].[UserModulePermission] CHECK CONSTRAINT [FK_UserModulePermission_Users]
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'UserLocationPermission'
)
BEGIN
    CREATE TABLE [dbo].[UserLocationPermission](
        [UserLocationPermissionID] [int] IDENTITY(1,1) NOT NULL,
        [UserID] [int] NOT NULL,
        [PlantID] [int] NOT NULL,
        [CanView] [bit] NOT NULL DEFAULT (1),
        [CanAdd] [bit] NOT NULL DEFAULT (0),
        [CanEdit] [bit] NOT NULL DEFAULT (0),
    PRIMARY KEY CLUSTERED
    (
        [UserLocationPermissionID] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
    CONSTRAINT [UQ_UserLocationPermission_UserPlant] UNIQUE ([UserID], [PlantID])
    ) ON [PRIMARY]

    ALTER TABLE [dbo].[UserLocationPermission] WITH CHECK ADD CONSTRAINT [FK_UserLocationPermission_Users]
        FOREIGN KEY([UserID]) REFERENCES [dbo].[Users] ([UserID])
    ALTER TABLE [dbo].[UserLocationPermission] CHECK CONSTRAINT [FK_UserLocationPermission_Users]

    ALTER TABLE [dbo].[UserLocationPermission] WITH CHECK ADD CONSTRAINT [FK_UserLocationPermission_Plants]
        FOREIGN KEY([PlantID]) REFERENCES [dbo].[Plants] ([PlantID])
    ALTER TABLE [dbo].[UserLocationPermission] CHECK CONSTRAINT [FK_UserLocationPermission_Plants]
END
GO

/* ---------------------------------------------------------------------
   11) Add IsActive to DestinationMaster, WeightMaster, VehicleTypes
   Task item 7: full CRUD including activate/deactivate for these masters.
   None of the three had an active flag at all, so there was no column
   for the soft-delete (crud.service.js softDeleteField) added in this
   pass to toggle.
   --------------------------------------------------------------------- */
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[DestinationMaster]') AND name = 'IsActive'
)
BEGIN
    ALTER TABLE [dbo].[DestinationMaster] ADD [IsActive] [bit] NOT NULL DEFAULT (1);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[WeightMaster]') AND name = 'IsActive'
)
BEGIN
    ALTER TABLE [dbo].[WeightMaster] ADD [IsActive] [bit] NOT NULL DEFAULT (1);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[VehicleTypes]') AND name = 'IsActive'
)
BEGIN
    ALTER TABLE [dbo].[VehicleTypes] ADD [IsActive] [bit] NOT NULL DEFAULT (1);
END
GO

/* ---------------------------------------------------------------------
   12) Add UserPreferences.DefaultPlantIDs
   Task item 5: Default Plant/Location becomes a multi-select with
   checkboxes rather than a single-choice dropdown, so a user can be
   assigned more than one usable default location.
   --------------------------------------------------------------------- */
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[UserPreferences]') AND name = 'DefaultPlantIDs'
)
BEGIN
    ALTER TABLE [dbo].[UserPreferences] ADD [DefaultPlantIDs] [nvarchar](max) NULL;
END
GO

/* =====================================================================
   End of migration_v2.sql
   ===================================================================== */
