/* =====================================================================
   Freight_Invoice_DB - complete database script (schema up to v18)
   =====================================================================
   One file that replaces schema_full.sql + migration_v2 ... migration_v18.

   SAFE TO RUN MORE THAN ONCE, on:
     - an empty server        -> creates the database and every table
     - a partly built database -> creates only what is missing and
                                  upgrades old tables to the latest shape
     - a fully built database  -> changes nothing

   Every CREATE / ALTER is guarded with an existence check, so you will
   not get "There is already an object named ..." errors.

   Run in SSMS: open this file, press Execute (F5). No need to pick the
   database first - the script switches to [Freight_Invoice_DB] itself.

   After running:
     1) In server/.env set   DB_NAME=Freight_Invoice_DB
     2) Change the admin e-mail in section 6 (before running), then from
        the server folder run:
            node scripts/setAdminPassword.js <that e-mail>

   BACK UP the database first if it already holds data. Section 5 drops
   tables the application no longer uses (same as migration_v18.sql).
   ===================================================================== */

IF DB_ID(N'Freight_Invoice_DB') IS NULL
BEGIN
    CREATE DATABASE [Freight_Invoice_DB];
END
GO

USE [Freight_Invoice_DB];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
GO

/* =====================================================================
   1) TABLES
   Each table is created in its final (v18) shape only if it does not
   exist yet. Foreign keys are added in section 3, after every table
   exists, so the order here does not matter.
   ===================================================================== */

-- Organisation hierarchy ---------------------------------------------
IF OBJECT_ID(N'[dbo].[Companies]', N'U') IS NULL
CREATE TABLE [dbo].[Companies](
    [CompanyID]   [int] IDENTITY(1,1) NOT NULL,
    [CompanyName] [nvarchar](200) NOT NULL,
    [IsActive]    [bit] NULL CONSTRAINT [DF_Companies_IsActive] DEFAULT (1),
    [CreatedAt]   [datetime] NULL CONSTRAINT [DF_Companies_CreatedAt] DEFAULT (getdate()),
    CONSTRAINT [PK_Companies] PRIMARY KEY CLUSTERED ([CompanyID] ASC),
    CONSTRAINT [UQ_Companies_CompanyName] UNIQUE ([CompanyName])
);
GO

IF OBJECT_ID(N'[dbo].[SBUs]', N'U') IS NULL
CREATE TABLE [dbo].[SBUs](
    [SBUID]     [int] IDENTITY(1,1) NOT NULL,
    [CompanyID] [int] NOT NULL,
    [SBUName]   [nvarchar](200) NOT NULL,
    [IsActive]  [bit] NULL CONSTRAINT [DF_SBUs_IsActive] DEFAULT (1),
    [CreatedAt] [datetime] NULL CONSTRAINT [DF_SBUs_CreatedAt] DEFAULT (getdate()),
    CONSTRAINT [PK_SBUs] PRIMARY KEY CLUSTERED ([SBUID] ASC)
);
GO

IF OBJECT_ID(N'[dbo].[PlantsHierarchy]', N'U') IS NULL
CREATE TABLE [dbo].[PlantsHierarchy](
    [PlantHierarchyID] [int] IDENTITY(1,1) NOT NULL,
    [SBUID]            [int] NOT NULL,
    [PlantName]        [nvarchar](200) NOT NULL,
    [PlantCode]        [varchar](50) NULL,
    [IsActive]         [bit] NULL CONSTRAINT [DF_PlantsHierarchy_IsActive] DEFAULT (1),
    [CreatedAt]        [datetime] NULL CONSTRAINT [DF_PlantsHierarchy_CreatedAt] DEFAULT (getdate()),
    CONSTRAINT [PK_PlantsHierarchy] PRIMARY KEY CLUSTERED ([PlantHierarchyID] ASC)
);
GO

IF OBJECT_ID(N'[dbo].[PlantLocations]', N'U') IS NULL
CREATE TABLE [dbo].[PlantLocations](
    [LocationID]       [int] IDENTITY(1,1) NOT NULL,
    [PlantHierarchyID] [int] NULL,
    [LocationName]     [varchar](255) NOT NULL,
    [IsActive]         [bit] NULL CONSTRAINT [DF_PlantLocations_IsActive] DEFAULT (1),
    [CreatedAt]        [datetime] NULL CONSTRAINT [DF_PlantLocations_CreatedAt] DEFAULT (getdate()),
    CONSTRAINT [PK_PlantLocations] PRIMARY KEY CLUSTERED ([LocationID] ASC)
);
GO

IF OBJECT_ID(N'[dbo].[Plants]', N'U') IS NULL
CREATE TABLE [dbo].[Plants](
    [PlantID]    [int] IDENTITY(1,1) NOT NULL,
    [PlantCode]  [varchar](20) NULL,
    [PlantName]  [nvarchar](200) NULL,
    [City]       [nvarchar](100) NULL,
    [State]      [nvarchar](100) NULL,
    [IsActive]   [bit] NULL CONSTRAINT [DF_Plants_IsActive] DEFAULT (1),
    [LocationID] [int] NULL,
    CONSTRAINT [PK_Plants] PRIMARY KEY CLUSTERED ([PlantID] ASC),
    CONSTRAINT [UQ_Plants_PlantCode] UNIQUE ([PlantCode])
);
GO

-- Users and roles ---------------------------------------------------------
IF OBJECT_ID(N'[dbo].[Roles]', N'U') IS NULL
CREATE TABLE [dbo].[Roles](
    [RoleID]      [int] IDENTITY(1,1) NOT NULL,
    [RoleName]    [nvarchar](100) NOT NULL,
    [Description] [nvarchar](500) NULL,
    [IsActive]    [bit] NULL CONSTRAINT [DF_Roles_IsActive] DEFAULT (1),
    [CreatedAt]   [datetime] NULL CONSTRAINT [DF_Roles_CreatedAt] DEFAULT (getdate()),
    CONSTRAINT [PK_Roles] PRIMARY KEY CLUSTERED ([RoleID] ASC),
    CONSTRAINT [UQ_Roles_RoleName] UNIQUE ([RoleName])
);
GO

IF OBJECT_ID(N'[dbo].[Users]', N'U') IS NULL
CREATE TABLE [dbo].[Users](
    [UserID]                 [int] IDENTITY(1,1) NOT NULL,
    [RoleID]                 [int] NOT NULL,
    [FullName]               [nvarchar](200) NULL,
    [Email]                  [nvarchar](200) NOT NULL,
    [PasswordHash]           [nvarchar](max) NULL,
    [MobileNo]               [varchar](20) NULL,
    [ProfilePhotoUrl]        [nvarchar](500) NULL,
    [IsActive]               [bit] NULL CONSTRAINT [DF_Users_IsActive] DEFAULT (1),
    [LastLogin]              [datetime] NULL,
    [CreatedAt]              [datetime] NULL CONSTRAINT [DF_Users_CreatedAt] DEFAULT (getdate()),
    [PasswordResetTokenHash] [varchar](255) NULL,
    [PasswordResetExpiresAt] [datetime] NULL,
    [MustChangePassword]     [bit] NOT NULL CONSTRAINT [DF_Users_MustChangePassword] DEFAULT (1),
    [PasswordChangedAt]      [datetime] NULL,
    CONSTRAINT [PK_Users] PRIMARY KEY CLUSTERED ([UserID] ASC),
    CONSTRAINT [UQ_Users_Email] UNIQUE ([Email])
);
GO

IF OBJECT_ID(N'[dbo].[UserPreferences]', N'U') IS NULL
CREATE TABLE [dbo].[UserPreferences](
    [UserID]                   [int] NOT NULL,
    [NotificationEmailEnabled] [bit] NOT NULL CONSTRAINT [DF_UserPreferences_Email] DEFAULT (1),
    [NotificationSoundEnabled] [bit] NOT NULL CONSTRAINT [DF_UserPreferences_Sound] DEFAULT (1),
    [DefaultPlantID]           [int] NULL,
    [DefaultPlantIDs]          [nvarchar](max) NULL,
    [UpdatedAt]                [datetime] NULL CONSTRAINT [DF_UserPreferences_UpdatedAt] DEFAULT (getdate()),
    CONSTRAINT [PK_UserPreferences] PRIMARY KEY CLUSTERED ([UserID] ASC)
);
GO

IF OBJECT_ID(N'[dbo].[UserModulePermission]', N'U') IS NULL
CREATE TABLE [dbo].[UserModulePermission](
    [UserModulePermissionID] [int] IDENTITY(1,1) NOT NULL,
    [UserID]    [int] NOT NULL,
    [ModuleKey] [varchar](50) NOT NULL,
    [CanView]   [bit] NOT NULL CONSTRAINT [DF_UserModulePermission_CanView] DEFAULT (0),
    [CanAdd]    [bit] NOT NULL CONSTRAINT [DF_UserModulePermission_CanAdd] DEFAULT (0),
    [CanEdit]   [bit] NOT NULL CONSTRAINT [DF_UserModulePermission_CanEdit] DEFAULT (0),
    CONSTRAINT [PK_UserModulePermission] PRIMARY KEY CLUSTERED ([UserModulePermissionID] ASC),
    CONSTRAINT [UQ_UserModulePermission_UserModule] UNIQUE ([UserID], [ModuleKey])
);
GO

-- PlantID / LocationID are both optional: a grant targets either a legacy
-- Plants row or a hierarchy location. Uniqueness is enforced per kind with
-- the two filtered indexes in section 4.
IF OBJECT_ID(N'[dbo].[UserLocationPermission]', N'U') IS NULL
CREATE TABLE [dbo].[UserLocationPermission](
    [UserLocationPermissionID] [int] IDENTITY(1,1) NOT NULL,
    [UserID]     [int] NOT NULL,
    [PlantID]    [int] NULL,
    [LocationID] [int] NULL,
    [CanView]    [bit] NOT NULL CONSTRAINT [DF_UserLocationPermission_CanView] DEFAULT (1),
    [CanAdd]     [bit] NOT NULL CONSTRAINT [DF_UserLocationPermission_CanAdd] DEFAULT (0),
    [CanEdit]    [bit] NOT NULL CONSTRAINT [DF_UserLocationPermission_CanEdit] DEFAULT (0),
    [UpdatedAt]  [datetime] NULL,
    CONSTRAINT [PK_UserLocationPermission] PRIMARY KEY CLUSTERED ([UserLocationPermissionID] ASC)
);
GO

IF OBJECT_ID(N'[dbo].[AccessRequest]', N'U') IS NULL
CREATE TABLE [dbo].[AccessRequest](
    [AccessRequestID] [int] IDENTITY(1,1) NOT NULL,
    [UserID]          [int] NOT NULL,
    [RequestType]     [varchar](20) NOT NULL,
    [ModuleKey]       [varchar](50) NULL,
    [RequestedAction] [varchar](10) NULL,
    [PlantID]         [int] NULL,
    [LocationID]      [int] NULL,
    [Status]          [varchar](20) NOT NULL CONSTRAINT [DF_AccessRequest_Status] DEFAULT ('PENDING'),
    [RequestedAt]     [datetime] NULL CONSTRAINT [DF_AccessRequest_RequestedAt] DEFAULT (getdate()),
    [ResolvedBy]      [int] NULL,
    [ResolvedAt]      [datetime] NULL,
    CONSTRAINT [PK_AccessRequest] PRIMARY KEY CLUSTERED ([AccessRequestID] ASC)
);
GO

IF OBJECT_ID(N'[dbo].[PasswordHistories]', N'U') IS NULL
CREATE TABLE [dbo].[PasswordHistories](
    [PasswordHistoryID] [int] IDENTITY(1,1) NOT NULL,
    [UserID]       [int] NOT NULL,
    [PasswordHash] [nvarchar](255) NOT NULL,
    [createdAt]    [datetime] NOT NULL CONSTRAINT [DF_PasswordHistories_createdAt] DEFAULT (getdate()),
    [updatedAt]    [datetime] NOT NULL CONSTRAINT [DF_PasswordHistories_updatedAt] DEFAULT (getdate()),
    CONSTRAINT [PK_PasswordHistories] PRIMARY KEY CLUSTERED ([PasswordHistoryID] ASC)
);
GO

IF OBJECT_ID(N'[dbo].[PasswordOtps]', N'U') IS NULL
CREATE TABLE [dbo].[PasswordOtps](
    [PasswordOtpID] [int] IDENTITY(1,1) NOT NULL,
    [UserID]    [int] NOT NULL,
    [Purpose]   [varchar](30) NOT NULL,
    [OtpHash]   [nvarchar](255) NOT NULL,
    [ExpiresAt] [datetime] NOT NULL,
    [Attempts]  [int] NOT NULL CONSTRAINT [DF_PasswordOtps_Attempts] DEFAULT (0),
    [UsedAt]    [datetime] NULL,
    [createdAt] [datetime] NOT NULL CONSTRAINT [DF_PasswordOtps_createdAt] DEFAULT (getdate()),
    [updatedAt] [datetime] NOT NULL CONSTRAINT [DF_PasswordOtps_updatedAt] DEFAULT (getdate()),
    CONSTRAINT [PK_PasswordOtps] PRIMARY KEY CLUSTERED ([PasswordOtpID] ASC)
);
GO

IF OBJECT_ID(N'[dbo].[AuditLogs]', N'U') IS NULL
CREATE TABLE [dbo].[AuditLogs](
    [AuditID]    [int] IDENTITY(1,1) NOT NULL,
    [UserID]     [int] NULL,
    [TableName]  [varchar](100) NOT NULL,
    [RecordID]   [int] NULL,
    [ActionType] [varchar](20) NOT NULL,
    [OldData]    [text] NULL,
    [NewData]    [text] NULL,
    [IPAddress]  [varchar](45) NULL,
    [ActionDate] [datetime] NOT NULL CONSTRAINT [DF_AuditLogs_ActionDate] DEFAULT (getdate()),
    CONSTRAINT [PK_AuditLogs] PRIMARY KEY CLUSTERED ([AuditID] ASC)
);
GO

-- Masters ------------------------------------------------------------------
IF OBJECT_ID(N'[dbo].[StatusMaster]', N'U') IS NULL
CREATE TABLE [dbo].[StatusMaster](
    [StatusID]   [int] IDENTITY(1,1) NOT NULL,
    [StatusName] [nvarchar](100) NULL,
    [ModuleName] [nvarchar](100) NULL,
    CONSTRAINT [PK_StatusMaster] PRIMARY KEY CLUSTERED ([StatusID] ASC),
    CONSTRAINT [UQ_StatusMaster_Name_Module] UNIQUE ([StatusName], [ModuleName])
);
GO

IF OBJECT_ID(N'[dbo].[Vendors]', N'U') IS NULL
CREATE TABLE [dbo].[Vendors](
    [VendorID]      [int] IDENTITY(1,1) NOT NULL,
    [VendorCode]    [varchar](30) NULL,
    [VendorName]    [nvarchar](300) NULL,
    [Address]       [nvarchar](max) NULL,
    [ContactPerson] [nvarchar](200) NULL,
    [Email]         [nvarchar](200) NULL,
    [MobileNo]      [varchar](20) NULL,
    [PANNo]         [varchar](20) NULL,
    [IsActive]      [bit] NULL CONSTRAINT [DF_Vendors_IsActive] DEFAULT (1),
    [CreatedAt]     [datetime] NULL CONSTRAINT [DF_Vendors_CreatedAt] DEFAULT (getdate()),
    [UserRemarks]   [nvarchar](1000) NULL,
    [Remarks]       [nvarchar](1000) NULL,
    CONSTRAINT [PK_Vendors] PRIMARY KEY CLUSTERED ([VendorID] ASC),
    CONSTRAINT [UQ_Vendors_VendorCode] UNIQUE ([VendorCode])
);
GO

IF OBJECT_ID(N'[dbo].[VendorGST]', N'U') IS NULL
CREATE TABLE [dbo].[VendorGST](
    [VendorGSTID] [int] IDENTITY(1,1) NOT NULL,
    [VendorID]    [int] NULL,
    [GSTNumber]   [varchar](30) NULL,
    [StateName]   [nvarchar](100) NULL,
    [IsDefault]   [bit] NULL CONSTRAINT [DF_VendorGST_IsDefault] DEFAULT (0),
    CONSTRAINT [PK_VendorGST] PRIMARY KEY CLUSTERED ([VendorGSTID] ASC),
    CONSTRAINT [UQ_VendorGST_Vendor_GST] UNIQUE ([VendorID], [GSTNumber])
);
GO

IF OBJECT_ID(N'[dbo].[CustomerMaster]', N'U') IS NULL
CREATE TABLE [dbo].[CustomerMaster](
    [CustomerID]    [int] IDENTITY(1,1) NOT NULL,
    [CustomerName]  [nvarchar](300) NOT NULL,
    [PartyType]     [varchar](20) NOT NULL CONSTRAINT [DF_CustomerMaster_PartyType] DEFAULT ('CUSTOMER'),
    [ContactPerson] [nvarchar](200) NULL,
    [Email]         [nvarchar](200) NULL,
    [Phone]         [varchar](20) NULL,
    [Address]       [nvarchar](max) NULL,
    [IsActive]      [bit] NOT NULL CONSTRAINT [DF_CustomerMaster_IsActive] DEFAULT (1),
    [CreatedAt]     [datetime] NULL CONSTRAINT [DF_CustomerMaster_CreatedAt] DEFAULT (getdate()),
    [UserRemarks]   [nvarchar](1000) NULL,
    [Remarks]       [nvarchar](1000) NULL,
    CONSTRAINT [PK_CustomerMaster] PRIMARY KEY CLUSTERED ([CustomerID] ASC),
    CONSTRAINT [CK_CustomerMaster_PartyType] CHECK ([PartyType] IN ('CUSTOMER', 'SUPPLIER'))
);
GO

IF OBJECT_ID(N'[dbo].[DestinationMaster]', N'U') IS NULL
CREATE TABLE [dbo].[DestinationMaster](
    [DestinationID] [int] IDENTITY(1,1) NOT NULL,
    [City]          [nvarchar](200) NULL,
    [District]      [nvarchar](200) NULL,
    [State]         [nvarchar](200) NULL,
    [IsActive]      [bit] NOT NULL CONSTRAINT [DF_DestinationMaster_IsActive] DEFAULT (1),
    [UserRemarks]   [nvarchar](1000) NULL,
    [Remarks]       [nvarchar](1000) NULL,
    CONSTRAINT [PK_DestinationMaster] PRIMARY KEY CLUSTERED ([DestinationID] ASC)
);
GO

IF OBJECT_ID(N'[dbo].[VehicleTypes]', N'U') IS NULL
CREATE TABLE [dbo].[VehicleTypes](
    [VehicleTypeID] [int] IDENTITY(1,1) NOT NULL,
    [VehicleName]   [nvarchar](100) NULL,
    [Capacity]      [decimal](18, 2) NULL,
    [Unit]          [varchar](20) NULL,
    [IsActive]      [bit] NOT NULL CONSTRAINT [DF_VehicleTypes_IsActive] DEFAULT (1),
    [UserRemarks]   [nvarchar](1000) NULL,
    [Remarks]       [nvarchar](1000) NULL,
    CONSTRAINT [PK_VehicleTypes] PRIMARY KEY CLUSTERED ([VehicleTypeID] ASC),
    CONSTRAINT [UQ_VehicleTypes_VehicleName] UNIQUE ([VehicleName])
);
GO

IF OBJECT_ID(N'[dbo].[WeightMaster]', N'U') IS NULL
CREATE TABLE [dbo].[WeightMaster](
    [WeightID]    [int] IDENTITY(1,1) NOT NULL,
    [Weight]      [decimal](18, 2) NOT NULL,
    [WeightUnit]  [varchar](20) NOT NULL CONSTRAINT [DF_WeightMaster_WeightUnit] DEFAULT ('MT'),
    [IsActive]    [bit] NOT NULL CONSTRAINT [DF_WeightMaster_IsActive] DEFAULT (1),
    [UserRemarks] [nvarchar](1000) NULL,
    [Remarks]     [nvarchar](1000) NULL,
    CONSTRAINT [PK_WeightMaster] PRIMARY KEY CLUSTERED ([WeightID] ASC)
);
GO

-- Contracts ----------------------------------------------------------------
IF OBJECT_ID(N'[dbo].[ContractMaster]', N'U') IS NULL
CREATE TABLE [dbo].[ContractMaster](
    [ContractID]         [int] IDENTITY(1,1) NOT NULL,
    [ContractNo]         [nvarchar](100) NOT NULL,
    [VendorID]           [int] NULL,
    [PlantID]            [int] NULL,
    [ContractStartDate]  [date] NULL,
    [ContractEndDate]    [date] NULL,
    [StatusID]           [int] NULL,
    [Remarks]            [nvarchar](max) NULL,
    [CreatedBy]          [int] NULL,
    [CreatedAt]          [datetime2](7) NULL CONSTRAINT [DF_ContractMaster_CreatedAt] DEFAULT (getdate()),
    [VendorPAN]          [varchar](20) NULL,
    [DieselBasePrice]    [decimal](18, 2) NULL,
    [DieselRevision]     [nvarchar](100) NULL,
    [RateMatrixFileName] [nvarchar](255) NULL,
    [UpdatedBy]          [int] NULL,
    [UpdatedAt]          [datetime2](7) NULL,
    [Status]             [nvarchar](30) NULL,
    [ContactPerson]      [nvarchar](200) NULL,
    [ContractType]       [nvarchar](30) NOT NULL CONSTRAINT [DF_ContractMaster_ContractType] DEFAULT ('FTL_OUTBOUND'),
    [UserRemarks]        [nvarchar](1000) NULL,
    CONSTRAINT [PK_ContractMaster] PRIMARY KEY CLUSTERED ([ContractID] ASC)
);
GO

IF OBJECT_ID(N'[dbo].[ContractRateMatrix]', N'U') IS NULL
CREATE TABLE [dbo].[ContractRateMatrix](
    [RateID]           [int] IDENTITY(1,1) NOT NULL,
    [ContractID]       [int] NULL,
    [DestinationID]    [int] NULL,
    [VehicleTypeID]    [int] NULL,
    [WeightID]         [int] NULL,
    [BaseRate]         [decimal](18, 4) NULL,
    [PerKMRate]        [decimal](18, 2) NULL,
    [FixedRate]        [decimal](18, 2) NULL,
    [EffectiveFrom]    [date] NULL,
    [EffectiveTo]      [date] NULL,
    [DistanceKM]       [decimal](18, 2) NULL,
    [DeliveryLocation] [nvarchar](200) NULL,
    [TransitDays]      [int] NULL,
    CONSTRAINT [PK_ContractRateMatrix] PRIMARY KEY CLUSTERED ([RateID] ASC),
    CONSTRAINT [UC_Contract_Dest_Vehicle_New] UNIQUE ([ContractID], [DestinationID], [VehicleTypeID], [WeightID])
);
GO

IF OBJECT_ID(N'[dbo].[ContractCharges]', N'U') IS NULL
CREATE TABLE [dbo].[ContractCharges](
    [ChargeID]     [int] IDENTITY(1,1) NOT NULL,
    [ContractID]   [int] NOT NULL,
    [ChargeCode]   [nvarchar](50) NOT NULL,
    [Category]     [nvarchar](20) NULL,
    [WeightFromKG] [decimal](18, 2) NULL,
    [WeightToKG]   [decimal](18, 2) NULL,
    [Amount]       [decimal](18, 4) NOT NULL,
    [Remarks]      [nvarchar](500) NULL,
    CONSTRAINT [PK_ContractCharges] PRIMARY KEY CLUSTERED ([ChargeID] ASC)
);
GO

IF OBJECT_ID(N'[dbo].[ContractZoneRates]', N'U') IS NULL
CREATE TABLE [dbo].[ContractZoneRates](
    [ZoneRateID]   [int] IDENTITY(1,1) NOT NULL,
    [ContractID]   [int] NOT NULL,
    [ZoneCode]     [nvarchar](50) NOT NULL,
    [Coverage]     [nvarchar](1000) NOT NULL,
    [WeightFromKG] [decimal](18, 2) NOT NULL,
    [WeightToKG]   [decimal](18, 2) NULL,
    [RatePerKG]    [decimal](18, 4) NOT NULL,
    CONSTRAINT [PK_ContractZoneRates] PRIMARY KEY CLUSTERED ([ZoneRateID] ASC),
    CONSTRAINT [UQ_ContractZoneRates_Contract_Zone_Band] UNIQUE ([ContractID], [ZoneCode], [WeightFromKG])
);
GO

-- Invoices -----------------------------------------------------------------
IF OBJECT_ID(N'[dbo].[InvoiceHeader]', N'U') IS NULL
CREATE TABLE [dbo].[InvoiceHeader](
    [InvoiceID]              [bigint] IDENTITY(1,1) NOT NULL,
    [InvoiceNumber]          [varchar](100) NOT NULL,
    [InvoiceDate]            [date] NOT NULL,
    [VendorID]               [int] NOT NULL,
    [VendorGSTID]            [int] NULL,
    [PlantID]                [int] NOT NULL,
    [ContractID]             [int] NULL,
    [LRNumber]               [varchar](100) NULL,
    [LRDate]                 [date] NULL,
    [VehicleTypeID]          [int] NULL,
    [TotalWeight]            [decimal](18, 2) NULL,
    [DistanceKM]             [decimal](18, 2) NULL,
    [BasicFreight]           [decimal](18, 2) NULL,
    [OtherCharges]           [decimal](18, 2) NULL,
    [GSTAmount]              [decimal](18, 2) NULL,
    [TotalInvoiceAmount]     [decimal](18, 2) NULL,
    [InvoiceStatusID]        [int] NULL,
    [UploadedBy]             [int] NULL,
    [UploadedDate]           [datetime] NULL CONSTRAINT [DF_InvoiceHeader_UploadedDate] DEFAULT (getdate()),
    [DetainCharges]          [decimal](18, 2) NULL CONSTRAINT [DF_InvoiceHeader_DetainCharges] DEFAULT (0),
    [ExtraCharges]           [decimal](18, 2) NULL CONSTRAINT [DF_InvoiceHeader_ExtraCharges] DEFAULT (0),
    [FromStation]            [varchar](100) NULL,
    [ToStation]              [varchar](100) NULL,
    [Remarks]                [varchar](max) NULL,
    [Doc1Path]               [nvarchar](max) NULL,
    [Doc2Path]               [nvarchar](max) NULL,
    [Doc3Path]               [nvarchar](max) NULL,
    [CustomerName]           [nvarchar](255) NULL,
    [LocationName]           [varchar](200) NULL,
    [IsPreApproved]          [bit] NOT NULL CONSTRAINT [DF_InvoiceHeader_IsPreApproved] DEFAULT (0),
    [LocationID]             [int] NULL,
    [ContractType]           [nvarchar](30) NULL,
    [Packages]               [int] NULL,
    [ChargedWeight]          [decimal](18, 2) NULL,
    [BilledRate]             [decimal](18, 4) NULL,
    [DocketCharges]          [decimal](18, 2) NULL,
    [ODACategory]            [nvarchar](5) NULL,
    [ODACharges]             [decimal](18, 2) NULL,
    [FOVCharges]             [decimal](18, 2) NULL,
    [LoadingCharges]         [decimal](18, 2) NULL,
    [UserRemarks]            [nvarchar](1000) NULL,
    [ApprovalStatus]         [varchar](30) NULL,
    [CurrentStepOrder]       [int] NULL,
    [SelectedApproverUserID] [int] NULL,
    [DraftCreatedAt]         [datetime] NULL,
    [SubmittedForApprovalAt] [datetime] NULL,
    [FinalApprovedAt]        [datetime] NULL,
    [FinalApprovedBy]        [int] NULL,
    [SONumber]               [nvarchar](50) NULL,
    CONSTRAINT [PK_InvoiceHeader] PRIMARY KEY CLUSTERED ([InvoiceID] ASC)
);
GO

IF OBJECT_ID(N'[dbo].[InvoiceItems]', N'U') IS NULL
CREATE TABLE [dbo].[InvoiceItems](
    [InvoiceItemID]       [bigint] IDENTITY(1,1) NOT NULL,
    [InvoiceID]           [bigint] NOT NULL,
    [DestinationID]       [int] NULL,
    [WeightID]            [int] NULL,
    [ActualWeight]        [decimal](18, 2) NULL,
    [DistanceKM]          [decimal](18, 2) NULL,
    [Rate]                [decimal](18, 2) NULL,
    [FreightAmount]       [decimal](18, 2) NULL,
    [PartyInvoiceNo]      [varchar](100) NULL,
    [ConsigneeName]       [nvarchar](200) NULL,
    [MaterialDescription] [nvarchar](200) NULL,
    [ManifestNo]          [varchar](50) NULL,
    CONSTRAINT [PK_InvoiceItems] PRIMARY KEY CLUSTERED ([InvoiceItemID] ASC)
);
GO

IF OBJECT_ID(N'[dbo].[InvoiceVerification]', N'U') IS NULL
CREATE TABLE [dbo].[InvoiceVerification](
    [VerificationID]     [bigint] IDENTITY(1,1) NOT NULL,
    [InvoiceID]          [bigint] NULL,
    [ContractID]         [int] NULL,
    [ExpectedAmount]     [decimal](18, 2) NULL,
    [InvoiceAmount]      [decimal](18, 2) NULL,
    [DifferenceAmount]   [decimal](18, 2) NULL,
    [VerificationStatus] [varchar](50) NULL,
    [VerifiedBy]         [int] NULL,
    [VerifiedDate]       [datetime] NULL,
    CONSTRAINT [PK_InvoiceVerification] PRIMARY KEY CLUSTERED ([VerificationID] ASC)
);
GO

IF OBJECT_ID(N'[dbo].[InvoiceApprovalHistory]', N'U') IS NULL
CREATE TABLE [dbo].[InvoiceApprovalHistory](
    [ApprovalID]   [bigint] IDENTITY(1,1) NOT NULL,
    [InvoiceID]    [bigint] NULL,
    [OldStatusID]  [int] NULL,
    [StatusID]     [int] NULL,
    [ApprovedBy]   [int] NULL,
    [Remarks]      [nvarchar](max) NULL,
    [ApprovedDate] [datetime] NULL CONSTRAINT [DF_InvoiceApprovalHistory_ApprovedDate] DEFAULT (getdate()),
    CONSTRAINT [PK_InvoiceApprovalHistory] PRIMARY KEY CLUSTERED ([ApprovalID] ASC)
);
GO

IF OBJECT_ID(N'[dbo].[InvoiceDrafts]', N'U') IS NULL
CREATE TABLE [dbo].[InvoiceDrafts](
    [DraftID]      [int] IDENTITY(1,1) NOT NULL,
    [UserID]       [int] NOT NULL,
    [Title]        [nvarchar](200) NULL,
    [ContractType] [varchar](30) NULL,
    [InvoiceCount] [int] NOT NULL CONSTRAINT [DF_InvoiceDrafts_InvoiceCount] DEFAULT (0),
    [Payload]      [nvarchar](max) NOT NULL,
    [Files]        [nvarchar](max) NULL,
    [CreatedAt]    [datetime] NOT NULL CONSTRAINT [DF_InvoiceDrafts_CreatedAt] DEFAULT (getdate()),
    [UpdatedAt]    [datetime] NULL,
    [DraftType]    [varchar](10) NOT NULL CONSTRAINT [DF_InvoiceDrafts_DraftType] DEFAULT ('ADD'),
    [LastEditedBy] [int] NULL,
    CONSTRAINT [PK_InvoiceDrafts] PRIMARY KEY CLUSTERED ([DraftID] ASC),
    CONSTRAINT [CK_InvoiceDrafts_DraftType] CHECK ([DraftType] IN ('ADD', 'EDIT'))
);
GO

IF OBJECT_ID(N'[dbo].[InvoiceDraftShares]', N'U') IS NULL
CREATE TABLE [dbo].[InvoiceDraftShares](
    [ShareID]        [int] IDENTITY(1,1) NOT NULL,
    [DraftID]        [int] NOT NULL,
    [UserID]         [int] NOT NULL,
    [SharedByUserID] [int] NOT NULL,
    [Comment]        [nvarchar](1000) NULL,
    [SharedAt]       [datetime] NOT NULL CONSTRAINT [DF_InvoiceDraftShares_SharedAt] DEFAULT (getdate()),
    CONSTRAINT [PK_InvoiceDraftShares] PRIMARY KEY CLUSTERED ([ShareID] ASC),
    CONSTRAINT [UQ_InvoiceDraftShares_Draft_User] UNIQUE ([DraftID], [UserID])
);
GO

IF OBJECT_ID(N'[dbo].[Notifications]', N'U') IS NULL
CREATE TABLE [dbo].[Notifications](
    [NotificationID]   [bigint] IDENTITY(1,1) NOT NULL,
    [Type]             [varchar](50) NOT NULL,
    [Message]          [varchar](500) NOT NULL,
    [RelatedInvoiceID] [bigint] NULL,
    [CreatedAt]        [datetime] NULL CONSTRAINT [DF_Notifications_CreatedAt] DEFAULT (getdate()),
    [UserID]           [int] NULL,
    CONSTRAINT [PK_Notifications] PRIMARY KEY CLUSTERED ([NotificationID] ASC)
);
GO

-- Invoice approval workflow ---------------------------------------------
-- ApprovalConfig is the old single-level approver table. It is kept for
-- reference only; the application now reads ApprovalWorkflow* below.
IF OBJECT_ID(N'[dbo].[ApprovalConfig]', N'U') IS NULL
CREATE TABLE [dbo].[ApprovalConfig](
    [ConfigID]         [int] IDENTITY(1,1) NOT NULL,
    [CompanyID]        [int] NULL,
    [SBUID]            [int] NULL,
    [PlantHierarchyID] [int] NULL,
    [PrimaryUserID]    [int] NOT NULL,
    [PrimaryEmail]     [nvarchar](200) NOT NULL,
    [OptionalUserID]   [int] NULL,
    [OptionalEmail]    [nvarchar](200) NULL,
    [IsPrimaryActive]  [bit] NULL CONSTRAINT [DF_ApprovalConfig_IsPrimaryActive] DEFAULT (1),
    [IsOptionalActive] [bit] NULL CONSTRAINT [DF_ApprovalConfig_IsOptionalActive] DEFAULT (1),
    [CreatedAt]        [datetime] NULL CONSTRAINT [DF_ApprovalConfig_CreatedAt] DEFAULT (getdate()),
    [LocationID]       [int] NULL,
    CONSTRAINT [PK_ApprovalConfig] PRIMARY KEY CLUSTERED ([ConfigID] ASC)
);
GO

IF OBJECT_ID(N'[dbo].[ApprovalWorkflowSteps]', N'U') IS NULL
CREATE TABLE [dbo].[ApprovalWorkflowSteps](
    [StepID]     [int] IDENTITY(1,1) NOT NULL,
    [LocationID] [int] NOT NULL,
    [StepOrder]  [int] NOT NULL,
    [StepName]   [nvarchar](100) NOT NULL,
    [StepType]   [varchar](20) NOT NULL,
    [AssignMode] [varchar](20) NOT NULL,
    [CreatedAt]  [datetime] NOT NULL CONSTRAINT [DF_ApprovalWorkflowSteps_CreatedAt] DEFAULT (getdate()),
    [UpdatedBy]  [int] NULL,
    CONSTRAINT [PK_ApprovalWorkflowSteps] PRIMARY KEY CLUSTERED ([StepID] ASC),
    CONSTRAINT [UQ_ApprovalWorkflowSteps_Location_Order] UNIQUE ([LocationID], [StepOrder]),
    CONSTRAINT [CK_ApprovalWorkflowSteps_StepType] CHECK ([StepType] IN ('APPROVAL', 'NOTIFY')),
    CONSTRAINT [CK_ApprovalWorkflowSteps_AssignMode] CHECK ([AssignMode] IN ('UPLOADER_SELECTS', 'ALL_USERS'))
);
GO

IF OBJECT_ID(N'[dbo].[ApprovalWorkflowStepUsers]', N'U') IS NULL
CREATE TABLE [dbo].[ApprovalWorkflowStepUsers](
    [StepUserID] [int] IDENTITY(1,1) NOT NULL,
    [StepID]     [int] NOT NULL,
    [UserID]     [int] NOT NULL,
    CONSTRAINT [PK_ApprovalWorkflowStepUsers] PRIMARY KEY CLUSTERED ([StepUserID] ASC),
    CONSTRAINT [UQ_ApprovalWorkflowStepUsers] UNIQUE ([StepID], [UserID])
);
GO

IF OBJECT_ID(N'[dbo].[ApprovalWorkflowSettings]', N'U') IS NULL
CREATE TABLE [dbo].[ApprovalWorkflowSettings](
    [LocationID]              [int] NOT NULL,
    [DiscrepancyStartStep]    [int] NULL,
    [SystemApprovedStartStep] [int] NULL,
    [PreApprovedStartStep]    [int] NULL,
    [UpdatedAt]               [datetime] NOT NULL CONSTRAINT [DF_ApprovalWorkflowSettings_UpdatedAt] DEFAULT (getdate()),
    [UpdatedBy]               [int] NULL,
    CONSTRAINT [PK_ApprovalWorkflowSettings] PRIMARY KEY CLUSTERED ([LocationID] ASC)
);
GO

IF OBJECT_ID(N'[dbo].[InvoiceApprovalTasks]', N'U') IS NULL
CREATE TABLE [dbo].[InvoiceApprovalTasks](
    [TaskID]         [bigint] IDENTITY(1,1) NOT NULL,
    [InvoiceID]      [bigint] NOT NULL,
    [StepOrder]      [int] NOT NULL,
    [StepName]       [nvarchar](100) NOT NULL,
    [StepType]       [varchar](20) NOT NULL,
    [AssignedUserID] [int] NOT NULL,
    [TaskStatus]     [varchar](20) NOT NULL,
    [AssignedAt]     [datetime] NOT NULL CONSTRAINT [DF_InvoiceApprovalTasks_AssignedAt] DEFAULT (getdate()),
    [ActedAt]        [datetime] NULL,
    [ActedBy]        [int] NULL,
    [Remarks]        [nvarchar](1000) NULL,
    CONSTRAINT [PK_InvoiceApprovalTasks] PRIMARY KEY CLUSTERED ([TaskID] ASC),
    CONSTRAINT [CK_InvoiceApprovalTasks_Status] CHECK ([TaskStatus] IN ('PENDING', 'APPROVED', 'REJECTED', 'NOTIFIED', 'CLOSED', 'CANCELLED'))
);
GO

IF OBJECT_ID(N'[dbo].[InvoiceWorkflowEvents]', N'U') IS NULL
CREATE TABLE [dbo].[InvoiceWorkflowEvents](
    [EventID]     [bigint] IDENTITY(1,1) NOT NULL,
    [InvoiceID]   [bigint] NOT NULL,
    [EventType]   [varchar](40) NOT NULL,
    [StepOrder]   [int] NULL,
    [StepName]    [nvarchar](100) NULL,
    [ActorUserID] [int] NULL,
    [Details]     [nvarchar](1000) NULL,
    [EventAt]     [datetime] NOT NULL CONSTRAINT [DF_InvoiceWorkflowEvents_EventAt] DEFAULT (getdate()),
    CONSTRAINT [PK_InvoiceWorkflowEvents] PRIMARY KEY CLUSTERED ([EventID] ASC)
);
GO

-- Master approval workflow -----------------------------------------------
IF OBJECT_ID(N'[dbo].[MasterApprovalSettings]', N'U') IS NULL
CREATE TABLE [dbo].[MasterApprovalSettings](
    [ModuleKey]     [varchar](50) NOT NULL,
    [AddEnabled]    [bit] NOT NULL CONSTRAINT [DF_MasterApprovalSettings_AddEnabled] DEFAULT (0),
    [EditEnabled]   [bit] NOT NULL CONSTRAINT [DF_MasterApprovalSettings_EditEnabled] DEFAULT (0),
    [SameApprovers] [bit] NOT NULL CONSTRAINT [DF_MasterApprovalSettings_SameApprovers] DEFAULT (1),
    [UpdatedAt]     [datetime] NOT NULL CONSTRAINT [DF_MasterApprovalSettings_UpdatedAt] DEFAULT (getdate()),
    [UpdatedBy]     [int] NULL,
    CONSTRAINT [PK_MasterApprovalSettings] PRIMARY KEY CLUSTERED ([ModuleKey] ASC)
);
GO

IF OBJECT_ID(N'[dbo].[MasterApprovalApprovers]', N'U') IS NULL
CREATE TABLE [dbo].[MasterApprovalApprovers](
    [MasterApproverID] [int] IDENTITY(1,1) NOT NULL,
    [ModuleKey]        [varchar](50) NOT NULL,
    [ActionType]       [varchar](10) NOT NULL,
    [UserID]           [int] NOT NULL,
    CONSTRAINT [PK_MasterApprovalApprovers] PRIMARY KEY CLUSTERED ([MasterApproverID] ASC),
    CONSTRAINT [UQ_MasterApprovalApprovers] UNIQUE ([ModuleKey], [ActionType], [UserID]),
    CONSTRAINT [CK_MasterApprovalApprovers_ActionType] CHECK ([ActionType] IN ('ADD', 'EDIT'))
);
GO

IF OBJECT_ID(N'[dbo].[MasterChangeRequests]', N'U') IS NULL
CREATE TABLE [dbo].[MasterChangeRequests](
    [RequestID]      [int] IDENTITY(1,1) NOT NULL,
    [ModuleKey]      [varchar](50) NOT NULL,
    [ActionType]     [varchar](10) NOT NULL,
    [Operation]      [varchar](10) NOT NULL CONSTRAINT [DF_MasterChangeRequests_Operation] DEFAULT ('SINGLE'),
    [RecordID]       [int] NULL,
    [RecordLabel]    [nvarchar](300) NULL,
    [Payload]        [nvarchar](max) NOT NULL,
    [OldData]        [nvarchar](max) NULL,
    [FileName]       [nvarchar](260) NULL,
    [FilePath]       [nvarchar](500) NULL,
    [Status]         [varchar](20) NOT NULL CONSTRAINT [DF_MasterChangeRequests_Status] DEFAULT ('PENDING'),
    [RequestedBy]    [int] NOT NULL,
    [RequestedAt]    [datetime] NOT NULL CONSTRAINT [DF_MasterChangeRequests_RequestedAt] DEFAULT (getdate()),
    [ActedBy]        [int] NULL,
    [ActedAt]        [datetime] NULL,
    [ActionRemarks]  [nvarchar](1000) NULL,
    [ResultRecordID] [int] NULL,
    [ResultMessage]  [nvarchar](1000) NULL,
    CONSTRAINT [PK_MasterChangeRequests] PRIMARY KEY CLUSTERED ([RequestID] ASC),
    CONSTRAINT [CK_MasterChangeRequests_ActionType] CHECK ([ActionType] IN ('ADD', 'EDIT')),
    CONSTRAINT [CK_MasterChangeRequests_Operation] CHECK ([Operation] IN ('SINGLE', 'BULK')),
    CONSTRAINT [CK_MasterChangeRequests_Status] CHECK ([Status] IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'))
);
GO

/* =====================================================================
   2) UPGRADE TABLES THAT ALREADY EXISTED IN AN OLDER SHAPE
   Only does something when a table was created earlier by schema_full.sql
   or by an older migration. On a brand-new database every check below is
   already satisfied and nothing runs.
   ===================================================================== */

-- 2a) Missing columns ---------------------------------------------------
IF COL_LENGTH('dbo.Users', 'ProfilePhotoUrl') IS NULL        ALTER TABLE [dbo].[Users] ADD [ProfilePhotoUrl] [nvarchar](500) NULL;
IF COL_LENGTH('dbo.Users', 'PasswordResetTokenHash') IS NULL ALTER TABLE [dbo].[Users] ADD [PasswordResetTokenHash] [varchar](255) NULL;
IF COL_LENGTH('dbo.Users', 'PasswordResetExpiresAt') IS NULL ALTER TABLE [dbo].[Users] ADD [PasswordResetExpiresAt] [datetime] NULL;
IF COL_LENGTH('dbo.Users', 'MustChangePassword') IS NULL     ALTER TABLE [dbo].[Users] ADD [MustChangePassword] [bit] NOT NULL CONSTRAINT [DF_Users_MustChangePassword] DEFAULT (1) WITH VALUES;
IF COL_LENGTH('dbo.Users', 'PasswordChangedAt') IS NULL      ALTER TABLE [dbo].[Users] ADD [PasswordChangedAt] [datetime] NULL;

IF COL_LENGTH('dbo.UserPreferences', 'DefaultPlantIDs') IS NULL ALTER TABLE [dbo].[UserPreferences] ADD [DefaultPlantIDs] [nvarchar](max) NULL;

IF COL_LENGTH('dbo.UserLocationPermission', 'LocationID') IS NULL ALTER TABLE [dbo].[UserLocationPermission] ADD [LocationID] [int] NULL;
IF COL_LENGTH('dbo.AccessRequest', 'LocationID') IS NULL          ALTER TABLE [dbo].[AccessRequest] ADD [LocationID] [int] NULL;
IF COL_LENGTH('dbo.Plants', 'LocationID') IS NULL                 ALTER TABLE [dbo].[Plants] ADD [LocationID] [int] NULL;
IF COL_LENGTH('dbo.Notifications', 'UserID') IS NULL              ALTER TABLE [dbo].[Notifications] ADD [UserID] [int] NULL;

IF COL_LENGTH('dbo.CustomerMaster', 'PartyType') IS NULL     ALTER TABLE [dbo].[CustomerMaster] ADD [PartyType] [varchar](20) NOT NULL CONSTRAINT [DF_CustomerMaster_PartyType] DEFAULT ('CUSTOMER') WITH VALUES;
IF COL_LENGTH('dbo.CustomerMaster', 'UserRemarks') IS NULL   ALTER TABLE [dbo].[CustomerMaster] ADD [UserRemarks] [nvarchar](1000) NULL;
IF COL_LENGTH('dbo.CustomerMaster', 'Remarks') IS NULL       ALTER TABLE [dbo].[CustomerMaster] ADD [Remarks] [nvarchar](1000) NULL;
IF COL_LENGTH('dbo.DestinationMaster', 'IsActive') IS NULL   ALTER TABLE [dbo].[DestinationMaster] ADD [IsActive] [bit] NOT NULL CONSTRAINT [DF_DestinationMaster_IsActive] DEFAULT (1);
IF COL_LENGTH('dbo.DestinationMaster', 'UserRemarks') IS NULL ALTER TABLE [dbo].[DestinationMaster] ADD [UserRemarks] [nvarchar](1000) NULL;
IF COL_LENGTH('dbo.DestinationMaster', 'Remarks') IS NULL    ALTER TABLE [dbo].[DestinationMaster] ADD [Remarks] [nvarchar](1000) NULL;
IF COL_LENGTH('dbo.VehicleTypes', 'IsActive') IS NULL        ALTER TABLE [dbo].[VehicleTypes] ADD [IsActive] [bit] NOT NULL CONSTRAINT [DF_VehicleTypes_IsActive] DEFAULT (1);
IF COL_LENGTH('dbo.VehicleTypes', 'UserRemarks') IS NULL     ALTER TABLE [dbo].[VehicleTypes] ADD [UserRemarks] [nvarchar](1000) NULL;
IF COL_LENGTH('dbo.VehicleTypes', 'Remarks') IS NULL         ALTER TABLE [dbo].[VehicleTypes] ADD [Remarks] [nvarchar](1000) NULL;
IF COL_LENGTH('dbo.WeightMaster', 'IsActive') IS NULL        ALTER TABLE [dbo].[WeightMaster] ADD [IsActive] [bit] NOT NULL CONSTRAINT [DF_WeightMaster_IsActive] DEFAULT (1);
IF COL_LENGTH('dbo.WeightMaster', 'UserRemarks') IS NULL     ALTER TABLE [dbo].[WeightMaster] ADD [UserRemarks] [nvarchar](1000) NULL;
IF COL_LENGTH('dbo.WeightMaster', 'Remarks') IS NULL         ALTER TABLE [dbo].[WeightMaster] ADD [Remarks] [nvarchar](1000) NULL;
IF COL_LENGTH('dbo.Vendors', 'UserRemarks') IS NULL          ALTER TABLE [dbo].[Vendors] ADD [UserRemarks] [nvarchar](1000) NULL;
IF COL_LENGTH('dbo.Vendors', 'Remarks') IS NULL              ALTER TABLE [dbo].[Vendors] ADD [Remarks] [nvarchar](1000) NULL;

IF COL_LENGTH('dbo.ContractMaster', 'ContactPerson') IS NULL ALTER TABLE [dbo].[ContractMaster] ADD [ContactPerson] [nvarchar](200) NULL;
IF COL_LENGTH('dbo.ContractMaster', 'ContractType') IS NULL  ALTER TABLE [dbo].[ContractMaster] ADD [ContractType] [nvarchar](30) NOT NULL CONSTRAINT [DF_ContractMaster_ContractType] DEFAULT ('FTL_OUTBOUND') WITH VALUES;

IF COL_LENGTH('dbo.ContractRateMatrix', 'DistanceKM') IS NULL       ALTER TABLE [dbo].[ContractRateMatrix] ADD [DistanceKM] [decimal](18, 2) NULL;
IF COL_LENGTH('dbo.ContractRateMatrix', 'DeliveryLocation') IS NULL ALTER TABLE [dbo].[ContractRateMatrix] ADD [DeliveryLocation] [nvarchar](200) NULL;
IF COL_LENGTH('dbo.ContractRateMatrix', 'TransitDays') IS NULL      ALTER TABLE [dbo].[ContractRateMatrix] ADD [TransitDays] [int] NULL;

IF COL_LENGTH('dbo.InvoiceHeader', 'LocationName') IS NULL           ALTER TABLE [dbo].[InvoiceHeader] ADD [LocationName] [varchar](200) NULL;
IF COL_LENGTH('dbo.InvoiceHeader', 'IsPreApproved') IS NULL          ALTER TABLE [dbo].[InvoiceHeader] ADD [IsPreApproved] [bit] NOT NULL CONSTRAINT [DF_InvoiceHeader_IsPreApproved] DEFAULT (0);
IF COL_LENGTH('dbo.InvoiceHeader', 'LocationID') IS NULL             ALTER TABLE [dbo].[InvoiceHeader] ADD [LocationID] [int] NULL;
IF COL_LENGTH('dbo.InvoiceHeader', 'ContractType') IS NULL           ALTER TABLE [dbo].[InvoiceHeader] ADD [ContractType] [nvarchar](30) NULL;
IF COL_LENGTH('dbo.InvoiceHeader', 'Packages') IS NULL               ALTER TABLE [dbo].[InvoiceHeader] ADD [Packages] [int] NULL;
IF COL_LENGTH('dbo.InvoiceHeader', 'ChargedWeight') IS NULL          ALTER TABLE [dbo].[InvoiceHeader] ADD [ChargedWeight] [decimal](18, 2) NULL;
IF COL_LENGTH('dbo.InvoiceHeader', 'BilledRate') IS NULL             ALTER TABLE [dbo].[InvoiceHeader] ADD [BilledRate] [decimal](18, 4) NULL;
IF COL_LENGTH('dbo.InvoiceHeader', 'DocketCharges') IS NULL          ALTER TABLE [dbo].[InvoiceHeader] ADD [DocketCharges] [decimal](18, 2) NULL;
IF COL_LENGTH('dbo.InvoiceHeader', 'ODACategory') IS NULL            ALTER TABLE [dbo].[InvoiceHeader] ADD [ODACategory] [nvarchar](5) NULL;
IF COL_LENGTH('dbo.InvoiceHeader', 'ODACharges') IS NULL             ALTER TABLE [dbo].[InvoiceHeader] ADD [ODACharges] [decimal](18, 2) NULL;
IF COL_LENGTH('dbo.InvoiceHeader', 'FOVCharges') IS NULL             ALTER TABLE [dbo].[InvoiceHeader] ADD [FOVCharges] [decimal](18, 2) NULL;
IF COL_LENGTH('dbo.InvoiceHeader', 'LoadingCharges') IS NULL         ALTER TABLE [dbo].[InvoiceHeader] ADD [LoadingCharges] [decimal](18, 2) NULL;
IF COL_LENGTH('dbo.InvoiceHeader', 'CurrentStepOrder') IS NULL       ALTER TABLE [dbo].[InvoiceHeader] ADD [CurrentStepOrder] [int] NULL;
IF COL_LENGTH('dbo.InvoiceHeader', 'SelectedApproverUserID') IS NULL ALTER TABLE [dbo].[InvoiceHeader] ADD [SelectedApproverUserID] [int] NULL;
IF COL_LENGTH('dbo.InvoiceHeader', 'DraftCreatedAt') IS NULL         ALTER TABLE [dbo].[InvoiceHeader] ADD [DraftCreatedAt] [datetime] NULL;
IF COL_LENGTH('dbo.InvoiceHeader', 'SubmittedForApprovalAt') IS NULL ALTER TABLE [dbo].[InvoiceHeader] ADD [SubmittedForApprovalAt] [datetime] NULL;
IF COL_LENGTH('dbo.InvoiceHeader', 'FinalApprovedAt') IS NULL        ALTER TABLE [dbo].[InvoiceHeader] ADD [FinalApprovedAt] [datetime] NULL;
IF COL_LENGTH('dbo.InvoiceHeader', 'FinalApprovedBy') IS NULL        ALTER TABLE [dbo].[InvoiceHeader] ADD [FinalApprovedBy] [int] NULL;
IF COL_LENGTH('dbo.InvoiceHeader', 'SONumber') IS NULL               ALTER TABLE [dbo].[InvoiceHeader] ADD [SONumber] [nvarchar](50) NULL;

IF COL_LENGTH('dbo.InvoiceItems', 'PartyInvoiceNo') IS NULL      ALTER TABLE [dbo].[InvoiceItems] ADD [PartyInvoiceNo] [varchar](100) NULL;
IF COL_LENGTH('dbo.InvoiceItems', 'ConsigneeName') IS NULL       ALTER TABLE [dbo].[InvoiceItems] ADD [ConsigneeName] [nvarchar](200) NULL;
IF COL_LENGTH('dbo.InvoiceItems', 'MaterialDescription') IS NULL ALTER TABLE [dbo].[InvoiceItems] ADD [MaterialDescription] [nvarchar](200) NULL;
IF COL_LENGTH('dbo.InvoiceItems', 'ManifestNo') IS NULL          ALTER TABLE [dbo].[InvoiceItems] ADD [ManifestNo] [varchar](50) NULL;

IF COL_LENGTH('dbo.InvoiceDrafts', 'DraftType') IS NULL    ALTER TABLE [dbo].[InvoiceDrafts] ADD [DraftType] [varchar](10) NOT NULL CONSTRAINT [DF_InvoiceDrafts_DraftType] DEFAULT ('ADD');
IF COL_LENGTH('dbo.InvoiceDrafts', 'LastEditedBy') IS NULL ALTER TABLE [dbo].[InvoiceDrafts] ADD [LastEditedBy] [int] NULL;
GO

-- 2b) Columns whose first add also moves existing data -----------------
-- ContractMaster: remarks typed by users move to UserRemarks (v13).
IF COL_LENGTH('dbo.ContractMaster', 'UserRemarks') IS NULL
BEGIN
    ALTER TABLE [dbo].[ContractMaster] ADD [UserRemarks] [nvarchar](1000) NULL;
    EXEC(N'UPDATE [dbo].[ContractMaster]
           SET [UserRemarks] = LEFT([Remarks], 1000), [Remarks] = NULL
           WHERE [Remarks] IS NOT NULL AND LTRIM(RTRIM([Remarks])) <> ''''');
END
GO

-- InvoiceHeader: split "<user text> | Audit: <audit text>" (v13).
IF COL_LENGTH('dbo.InvoiceHeader', 'UserRemarks') IS NULL
BEGIN
    ALTER TABLE [dbo].[InvoiceHeader] ADD [UserRemarks] [nvarchar](1000) NULL;
    EXEC(N'UPDATE [dbo].[InvoiceHeader]
           SET [UserRemarks] = LEFT(LEFT([Remarks], CHARINDEX('' | Audit: '', [Remarks]) - 1), 1000),
               [Remarks] = SUBSTRING([Remarks], CHARINDEX('' | Audit: '', [Remarks]) + 10, LEN([Remarks]))
           WHERE CHARINDEX('' | Audit: '', [Remarks]) > 0');
END
GO

-- InvoiceHeader: approval status from the stored audit outcome (v14).
IF COL_LENGTH('dbo.InvoiceHeader', 'ApprovalStatus') IS NULL
BEGIN
    ALTER TABLE [dbo].[InvoiceHeader] ADD [ApprovalStatus] [varchar](30) NULL;
    EXEC(N'UPDATE h
              SET h.[ApprovalStatus] = CASE
                      WHEN h.[IsPreApproved] = 1 THEN ''PRE_APPROVED''
                      WHEN v.[VerificationStatus] = ''APPROVED'' THEN ''APPROVED''
                      ELSE ''PENDING_APPROVAL''
                  END
             FROM [dbo].[InvoiceHeader] h
             LEFT JOIN [dbo].[InvoiceVerification] v ON v.[InvoiceID] = h.[InvoiceID]');
END
GO

-- InvoiceApprovalHistory.OldStatusID (v2 step 8)
IF COL_LENGTH('dbo.InvoiceApprovalHistory', 'OldStatusID') IS NULL
    ALTER TABLE [dbo].[InvoiceApprovalHistory] ADD [OldStatusID] [int] NULL;
GO

-- 2c) Columns that changed type / nullability ---------------------------
-- ContractRateMatrix.BaseRate keeps 4 decimals (v11).
IF EXISTS (SELECT 1 FROM sys.columns
           WHERE object_id = OBJECT_ID(N'[dbo].[ContractRateMatrix]') AND name = 'BaseRate' AND scale < 4)
    ALTER TABLE [dbo].[ContractRateMatrix] ALTER COLUMN [BaseRate] [decimal](18, 4) NULL;
GO

-- WeightMaster: FromWeight/ToWeight range -> single Weight (v3).
IF COL_LENGTH('dbo.WeightMaster', 'Weight') IS NULL
    ALTER TABLE [dbo].[WeightMaster] ADD [Weight] [decimal](18, 2) NULL;
GO
IF COL_LENGTH('dbo.WeightMaster', 'FromWeight') IS NOT NULL
    EXEC(N'UPDATE [dbo].[WeightMaster] SET [Weight] = [FromWeight] WHERE [Weight] IS NULL');
GO
UPDATE [dbo].[WeightMaster] SET [Weight] = 0 WHERE [Weight] IS NULL;
UPDATE [dbo].[WeightMaster] SET [WeightUnit] = 'MT' WHERE [WeightUnit] IS NULL OR [WeightUnit] = '';
GO

-- Columns removed from the application: drop them together with any
-- default, foreign key, index or unique constraint that uses them, so the
-- drop itself cannot fail. Also clears the old UNIQUE (UserID, PlantID)
-- on UserLocationPermission so PlantID can become nullable (v8).
DECLARE @work TABLE ([TableName] sysname, [ColumnName] sysname, [DropColumn] bit);
INSERT INTO @work VALUES
    (N'InvoiceHeader',          N'VehicleNumber', 1),
    (N'DestinationMaster',      N'Pincode',       1),
    (N'WeightMaster',           N'FromWeight',    1),
    (N'WeightMaster',           N'ToWeight',      1),
    (N'UserLocationPermission', N'PlantID',       0);

DECLARE @t sysname, @c sysname, @drop bit, @sql nvarchar(max);
DECLARE work_cursor CURSOR LOCAL FAST_FORWARD FOR
    SELECT [TableName], [ColumnName], [DropColumn] FROM @work;
OPEN work_cursor;
FETCH NEXT FROM work_cursor INTO @t, @c, @drop;
WHILE @@FETCH_STATUS = 0
BEGIN
    -- Skip columns that are already gone, and PlantID once it is nullable.
    IF COL_LENGTH(N'dbo.' + @t, @c) IS NOT NULL
       AND (@drop = 1 OR EXISTS (SELECT 1 FROM sys.columns
                                 WHERE object_id = OBJECT_ID(N'dbo.' + @t) AND name = @c AND is_nullable = 0))
    BEGIN
        SET @sql = N'';
        -- default constraints
        SELECT @sql += N'ALTER TABLE [dbo].' + QUOTENAME(@t) + N' DROP CONSTRAINT ' + QUOTENAME(dc.name) + N';'
          FROM sys.default_constraints dc
          JOIN sys.columns col ON col.object_id = dc.parent_object_id AND col.column_id = dc.parent_column_id
         WHERE dc.parent_object_id = OBJECT_ID(N'dbo.' + @t) AND col.name = @c;
        -- foreign keys on this column
        SELECT @sql += N'ALTER TABLE [dbo].' + QUOTENAME(@t) + N' DROP CONSTRAINT ' + QUOTENAME(fk.name) + N';'
          FROM sys.foreign_keys fk
         WHERE fk.parent_object_id = OBJECT_ID(N'dbo.' + @t)
           AND EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
                        JOIN sys.columns col ON col.object_id = fkc.parent_object_id AND col.column_id = fkc.parent_column_id
                       WHERE fkc.constraint_object_id = fk.object_id AND col.name = @c);
        -- unique constraints and plain indexes (never the primary key)
        SELECT @sql += CASE WHEN i.is_unique_constraint = 1
                            THEN N'ALTER TABLE [dbo].' + QUOTENAME(@t) + N' DROP CONSTRAINT ' + QUOTENAME(i.name) + N';'
                            ELSE N'DROP INDEX ' + QUOTENAME(i.name) + N' ON [dbo].' + QUOTENAME(@t) + N';'
                       END
          FROM sys.indexes i
         WHERE i.object_id = OBJECT_ID(N'dbo.' + @t) AND i.is_primary_key = 0
           AND EXISTS (SELECT 1 FROM sys.index_columns ic
                        JOIN sys.columns col ON col.object_id = ic.object_id AND col.column_id = ic.column_id
                       WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id AND col.name = @c);

        IF @drop = 1
            SET @sql += N'ALTER TABLE [dbo].' + QUOTENAME(@t) + N' DROP COLUMN ' + QUOTENAME(@c) + N';';
        ELSE
            SET @sql += N'ALTER TABLE [dbo].' + QUOTENAME(@t) + N' ALTER COLUMN ' + QUOTENAME(@c) + N' [int] NULL;';

        PRINT N'Upgrading ' + @t + N'.' + @c;
        EXEC sp_executesql @sql;
    END
    FETCH NEXT FROM work_cursor INTO @t, @c, @drop;
END
CLOSE work_cursor;
DEALLOCATE work_cursor;
GO

IF EXISTS (SELECT 1 FROM sys.columns
           WHERE object_id = OBJECT_ID(N'[dbo].[WeightMaster]') AND name = 'Weight' AND is_nullable = 1)
    ALTER TABLE [dbo].[WeightMaster] ALTER COLUMN [Weight] [decimal](18, 2) NOT NULL;
GO

-- WeightUnit becomes NOT NULL DEFAULT 'MT'. Any existing default is
-- dropped first so the ALTER COLUMN cannot be blocked by it; it is added
-- back right after.
IF EXISTS (SELECT 1 FROM sys.columns
           WHERE object_id = OBJECT_ID(N'[dbo].[WeightMaster]') AND name = 'WeightUnit' AND is_nullable = 1)
BEGIN
    DECLARE @df sysname = (SELECT dc.name FROM sys.default_constraints dc
                           JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
                           WHERE dc.parent_object_id = OBJECT_ID(N'[dbo].[WeightMaster]') AND c.name = 'WeightUnit');
    IF @df IS NOT NULL
        EXEC(N'ALTER TABLE [dbo].[WeightMaster] DROP CONSTRAINT ' + @df);
    ALTER TABLE [dbo].[WeightMaster] ALTER COLUMN [WeightUnit] [varchar](20) NOT NULL;
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints dc
               JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
               WHERE dc.parent_object_id = OBJECT_ID(N'[dbo].[WeightMaster]') AND c.name = 'WeightUnit')
    ALTER TABLE [dbo].[WeightMaster] ADD CONSTRAINT [DF_WeightMaster_WeightUnit] DEFAULT ('MT') FOR [WeightUnit];
GO

-- ContractNo is unique per vendor, not globally (v3).
IF EXISTS (SELECT 1 FROM sys.key_constraints
           WHERE name = 'UQ_ContractMaster_ContractNo' AND parent_object_id = OBJECT_ID(N'[dbo].[ContractMaster]'))
    ALTER TABLE [dbo].[ContractMaster] DROP CONSTRAINT [UQ_ContractMaster_ContractNo];
GO

-- Check constraints added to existing tables (v13, v15).
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_CustomerMaster_PartyType')
    ALTER TABLE [dbo].[CustomerMaster] ADD CONSTRAINT [CK_CustomerMaster_PartyType] CHECK ([PartyType] IN ('CUSTOMER', 'SUPPLIER'));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_InvoiceDrafts_DraftType')
    ALTER TABLE [dbo].[InvoiceDrafts] ADD CONSTRAINT [CK_InvoiceDrafts_DraftType] CHECK ([DraftType] IN ('ADD', 'EDIT'));
GO

-- UserLocationPermission.UpdatedAt and location-level Add / Edit (v16).
IF COL_LENGTH('dbo.UserLocationPermission', 'UpdatedAt') IS NULL
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

-- 2d) One-time data backfills (only touch rows that are still empty) ----
UPDATE ih
   SET ih.[LocationName] = p.[PlantName]
  FROM [dbo].[InvoiceHeader] ih
  JOIN [dbo].[Plants] p ON p.[PlantID] = ih.[PlantID]
 WHERE ih.[LocationName] IS NULL;

UPDATE cm
   SET cm.[ContactPerson] = COALESCE(NULLIF(LTRIM(RTRIM(v.[ContactPerson])), ''), v.[VendorName])
  FROM [dbo].[ContractMaster] cm
  JOIN [dbo].[Vendors] v ON v.[VendorID] = cm.[VendorID]
 WHERE cm.[ContactPerson] IS NULL OR LTRIM(RTRIM(cm.[ContactPerson])) = '';

UPDATE [dbo].[InvoiceHeader] SET [ContractType] = 'FTL_OUTBOUND' WHERE [ContractType] IS NULL;

-- Invoices without any history get their "created" event (v14).
INSERT INTO [dbo].[InvoiceWorkflowEvents] ([InvoiceID], [EventType], [ActorUserID], [Details], [EventAt])
SELECT h.[InvoiceID], 'CREATED', h.[UploadedBy],
       N'Invoice created (recorded before approval tracking existed).', ISNULL(h.[UploadedDate], GETDATE())
  FROM [dbo].[InvoiceHeader] h
 WHERE NOT EXISTS (SELECT 1 FROM [dbo].[InvoiceWorkflowEvents] e WHERE e.[InvoiceID] = h.[InvoiceID]);
GO

-- Old single-level approvers become step 1 "HOD Approval" (v14), only for
-- locations that have no workflow configured yet.
INSERT INTO [dbo].[ApprovalWorkflowSteps] ([LocationID], [StepOrder], [StepName], [StepType], [AssignMode])
SELECT DISTINCT ac.[LocationID], 1, N'HOD Approval', 'APPROVAL', 'UPLOADER_SELECTS'
  FROM [dbo].[ApprovalConfig] ac
 WHERE ac.[LocationID] IS NOT NULL
   AND ((ac.[PrimaryUserID] IS NOT NULL AND ac.[IsPrimaryActive] = 1)
     OR (ac.[OptionalUserID] IS NOT NULL AND ac.[IsOptionalActive] = 1))
   AND EXISTS (SELECT 1 FROM [dbo].[PlantLocations] pl WHERE pl.[LocationID] = ac.[LocationID])
   AND NOT EXISTS (SELECT 1 FROM [dbo].[ApprovalWorkflowSteps] s WHERE s.[LocationID] = ac.[LocationID])
   AND NOT EXISTS (SELECT 1 FROM [dbo].[ApprovalWorkflowSettings] st WHERE st.[LocationID] = ac.[LocationID]);

INSERT INTO [dbo].[ApprovalWorkflowStepUsers] ([StepID], [UserID])
SELECT DISTINCT s.[StepID], x.[UserID]
  FROM [dbo].[ApprovalConfig] ac
  JOIN [dbo].[ApprovalWorkflowSteps] s ON s.[LocationID] = ac.[LocationID] AND s.[StepOrder] = 1
                                      AND s.[StepName] = N'HOD Approval'
 CROSS APPLY (VALUES
      (CASE WHEN ac.[IsPrimaryActive] = 1 THEN ac.[PrimaryUserID] END),
      (CASE WHEN ac.[IsOptionalActive] = 1 THEN ac.[OptionalUserID] END)
 ) x([UserID])
 WHERE x.[UserID] IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM [dbo].[ApprovalWorkflowSettings] st WHERE st.[LocationID] = s.[LocationID])
   AND NOT EXISTS (SELECT 1 FROM [dbo].[ApprovalWorkflowStepUsers] su WHERE su.[StepID] = s.[StepID] AND su.[UserID] = x.[UserID]);

INSERT INTO [dbo].[ApprovalWorkflowSettings] ([LocationID], [DiscrepancyStartStep])
SELECT DISTINCT s.[LocationID], 1
  FROM [dbo].[ApprovalWorkflowSteps] s
 WHERE NOT EXISTS (SELECT 1 FROM [dbo].[ApprovalWorkflowSettings] st WHERE st.[LocationID] = s.[LocationID]);
GO

/* =====================================================================
   3) FOREIGN KEYS
   Each one is added only if that column does not already reference that
   table (whatever the existing constraint is called). If old rows break
   the rule, the key is still added WITH NOCHECK and a warning is printed,
   so the script never stops half way.
   ===================================================================== */
DECLARE @fk TABLE (
    [Name] sysname, [TableName] sysname, [ColumnName] sysname,
    [RefTable] sysname, [RefColumn] sysname, [OnDelete] nvarchar(20)
);
INSERT INTO @fk VALUES
    (N'FK_SBUs_Companies',                       N'SBUs',                      N'CompanyID',              N'Companies',             N'CompanyID',        N''),
    (N'FK_PlantsHierarchy_SBUs',                 N'PlantsHierarchy',           N'SBUID',                  N'SBUs',                  N'SBUID',            N''),
    (N'FK_PlantLocations_PlantsHierarchy',       N'PlantLocations',            N'PlantHierarchyID',       N'PlantsHierarchy',       N'PlantHierarchyID', N'CASCADE'),
    (N'FK_Plants_PlantLocations',                N'Plants',                    N'LocationID',             N'PlantLocations',        N'LocationID',       N''),
    (N'FK_Users_Roles',                          N'Users',                     N'RoleID',                 N'Roles',                 N'RoleID',           N''),
    (N'FK_UserPreferences_Users',                N'UserPreferences',           N'UserID',                 N'Users',                 N'UserID',           N''),
    (N'FK_UserPreferences_Plants',               N'UserPreferences',           N'DefaultPlantID',         N'Plants',                N'PlantID',          N''),
    (N'FK_UserModulePermission_Users',           N'UserModulePermission',      N'UserID',                 N'Users',                 N'UserID',           N''),
    (N'FK_UserLocationPermission_Users',         N'UserLocationPermission',    N'UserID',                 N'Users',                 N'UserID',           N''),
    (N'FK_UserLocationPermission_Plants',        N'UserLocationPermission',    N'PlantID',                N'Plants',                N'PlantID',          N''),
    (N'FK_UserLocationPermission_PlantLocations',N'UserLocationPermission',    N'LocationID',             N'PlantLocations',        N'LocationID',       N''),
    (N'FK_AccessRequest_Users',                  N'AccessRequest',             N'UserID',                 N'Users',                 N'UserID',           N''),
    (N'FK_AccessRequest_Plants',                 N'AccessRequest',             N'PlantID',                N'Plants',                N'PlantID',          N''),
    (N'FK_AccessRequest_PlantLocations',         N'AccessRequest',             N'LocationID',             N'PlantLocations',        N'LocationID',       N''),
    (N'FK_PasswordHistories_Users',              N'PasswordHistories',         N'UserID',                 N'Users',                 N'UserID',           N''),
    (N'FK_PasswordOtps_Users',                   N'PasswordOtps',              N'UserID',                 N'Users',                 N'UserID',           N''),
    (N'FK_VendorGST_Vendors',                    N'VendorGST',                 N'VendorID',               N'Vendors',               N'VendorID',         N''),
    (N'FK_ContractMaster_Users',                 N'ContractMaster',            N'CreatedBy',              N'Users',                 N'UserID',           N''),
    (N'FK_ContractMaster_Plants',                N'ContractMaster',            N'PlantID',                N'Plants',                N'PlantID',          N''),
    (N'FK_ContractMaster_StatusMaster',          N'ContractMaster',            N'StatusID',               N'StatusMaster',          N'StatusID',         N''),
    (N'FK_ContractMaster_Vendors',               N'ContractMaster',            N'VendorID',               N'Vendors',               N'VendorID',         N''),
    (N'FK_ContractRateMatrix_ContractMaster',    N'ContractRateMatrix',        N'ContractID',             N'ContractMaster',        N'ContractID',       N''),
    (N'FK_ContractRateMatrix_DestinationMaster', N'ContractRateMatrix',        N'DestinationID',          N'DestinationMaster',     N'DestinationID',    N''),
    (N'FK_ContractRateMatrix_VehicleTypes',      N'ContractRateMatrix',        N'VehicleTypeID',          N'VehicleTypes',          N'VehicleTypeID',    N''),
    (N'FK_ContractRateMatrix_WeightMaster',      N'ContractRateMatrix',        N'WeightID',               N'WeightMaster',          N'WeightID',         N''),
    (N'FK_ContractCharges_ContractMaster',       N'ContractCharges',           N'ContractID',             N'ContractMaster',        N'ContractID',       N'CASCADE'),
    (N'FK_ContractZoneRates_ContractMaster',     N'ContractZoneRates',         N'ContractID',             N'ContractMaster',        N'ContractID',       N'CASCADE'),
    (N'FK_InvoiceHeader_ContractMaster',         N'InvoiceHeader',             N'ContractID',             N'ContractMaster',        N'ContractID',       N''),
    (N'FK_InvoiceHeader_StatusMaster',           N'InvoiceHeader',             N'InvoiceStatusID',        N'StatusMaster',          N'StatusID',         N''),
    (N'FK_InvoiceHeader_Plants',                 N'InvoiceHeader',             N'PlantID',                N'Plants',                N'PlantID',          N''),
    (N'FK_InvoiceHeader_UploadedBy',             N'InvoiceHeader',             N'UploadedBy',             N'Users',                 N'UserID',           N''),
    (N'FK_InvoiceHeader_VehicleTypes',           N'InvoiceHeader',             N'VehicleTypeID',          N'VehicleTypes',          N'VehicleTypeID',    N''),
    (N'FK_InvoiceHeader_Vendors',                N'InvoiceHeader',             N'VendorID',               N'Vendors',               N'VendorID',         N''),
    (N'FK_InvoiceHeader_VendorGST',              N'InvoiceHeader',             N'VendorGSTID',            N'VendorGST',             N'VendorGSTID',      N''),
    (N'FK_InvoiceHeader_PlantLocations',         N'InvoiceHeader',             N'LocationID',             N'PlantLocations',        N'LocationID',       N''),
    (N'FK_InvoiceHeader_SelectedApprover',       N'InvoiceHeader',             N'SelectedApproverUserID', N'Users',                 N'UserID',           N''),
    (N'FK_InvoiceHeader_FinalApprovedBy',        N'InvoiceHeader',             N'FinalApprovedBy',        N'Users',                 N'UserID',           N''),
    (N'FK_InvoiceItems_InvoiceHeader',           N'InvoiceItems',              N'InvoiceID',              N'InvoiceHeader',         N'InvoiceID',        N''),
    (N'FK_InvoiceItems_DestinationMaster',       N'InvoiceItems',              N'DestinationID',          N'DestinationMaster',     N'DestinationID',    N''),
    (N'FK_InvoiceItems_WeightMaster',            N'InvoiceItems',              N'WeightID',               N'WeightMaster',          N'WeightID',         N''),
    (N'FK_InvoiceVerification_ContractMaster',   N'InvoiceVerification',       N'ContractID',             N'ContractMaster',        N'ContractID',       N''),
    (N'FK_InvoiceVerification_InvoiceHeader',    N'InvoiceVerification',       N'InvoiceID',              N'InvoiceHeader',         N'InvoiceID',        N''),
    (N'FK_InvoiceVerification_Users',            N'InvoiceVerification',       N'VerifiedBy',             N'Users',                 N'UserID',           N''),
    (N'FK_InvoiceApprovalHistory_InvoiceHeader', N'InvoiceApprovalHistory',    N'InvoiceID',              N'InvoiceHeader',         N'InvoiceID',        N''),
    (N'FK_InvoiceDrafts_Users',                  N'InvoiceDrafts',             N'UserID',                 N'Users',                 N'UserID',           N''),
    (N'FK_InvoiceDraftShares_InvoiceDrafts',     N'InvoiceDraftShares',        N'DraftID',                N'InvoiceDrafts',         N'DraftID',          N'CASCADE'),
    (N'FK_InvoiceDraftShares_Users',             N'InvoiceDraftShares',        N'UserID',                 N'Users',                 N'UserID',           N''),
    (N'FK_Notifications_InvoiceHeader',          N'Notifications',             N'RelatedInvoiceID',       N'InvoiceHeader',         N'InvoiceID',        N''),
    (N'FK_Notifications_Users',                  N'Notifications',             N'UserID',                 N'Users',                 N'UserID',           N''),
    (N'FK_ApprovalConfig_PlantLocations',        N'ApprovalConfig',            N'LocationID',             N'PlantLocations',        N'LocationID',       N''),
    (N'FK_ApprovalConfig_OptionalUser',          N'ApprovalConfig',            N'OptionalUserID',         N'Users',                 N'UserID',           N''),
    (N'FK_ApprovalConfig_PrimaryUser',           N'ApprovalConfig',            N'PrimaryUserID',          N'Users',                 N'UserID',           N''),
    (N'FK_ApprovalWorkflowSteps_PlantLocations', N'ApprovalWorkflowSteps',     N'LocationID',             N'PlantLocations',        N'LocationID',       N''),
    (N'FK_ApprovalWorkflowStepUsers_Steps',      N'ApprovalWorkflowStepUsers', N'StepID',                 N'ApprovalWorkflowSteps', N'StepID',           N'CASCADE'),
    (N'FK_ApprovalWorkflowStepUsers_Users',      N'ApprovalWorkflowStepUsers', N'UserID',                 N'Users',                 N'UserID',           N''),
    (N'FK_ApprovalWorkflowSettings_PlantLocations', N'ApprovalWorkflowSettings', N'LocationID',           N'PlantLocations',        N'LocationID',       N''),
    (N'FK_InvoiceApprovalTasks_InvoiceHeader',   N'InvoiceApprovalTasks',      N'InvoiceID',              N'InvoiceHeader',         N'InvoiceID',        N''),
    (N'FK_InvoiceApprovalTasks_Users',           N'InvoiceApprovalTasks',      N'AssignedUserID',         N'Users',                 N'UserID',           N''),
    (N'FK_InvoiceWorkflowEvents_InvoiceHeader',  N'InvoiceWorkflowEvents',     N'InvoiceID',              N'InvoiceHeader',         N'InvoiceID',        N''),
    (N'FK_MasterApprovalApprovers_Users',        N'MasterApprovalApprovers',   N'UserID',                 N'Users',                 N'UserID',           N''),
    (N'FK_MasterChangeRequests_RequestedBy',     N'MasterChangeRequests',      N'RequestedBy',            N'Users',                 N'UserID',           N''),
    (N'FK_MasterChangeRequests_ActedBy',         N'MasterChangeRequests',      N'ActedBy',                N'Users',                 N'UserID',           N'');

DECLARE @name sysname, @t sysname, @c sysname, @rt sysname, @rc sysname, @del nvarchar(20), @sql nvarchar(max);
DECLARE fk_cursor CURSOR LOCAL FAST_FORWARD FOR
    SELECT [Name], [TableName], [ColumnName], [RefTable], [RefColumn], [OnDelete] FROM @fk;
OPEN fk_cursor;
FETCH NEXT FROM fk_cursor INTO @name, @t, @c, @rt, @rc, @del;
WHILE @@FETCH_STATUS = 0
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM sys.foreign_key_columns fkc
          JOIN sys.columns col ON col.object_id = fkc.parent_object_id AND col.column_id = fkc.parent_column_id
         WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.' + @t)
           AND fkc.referenced_object_id = OBJECT_ID(N'dbo.' + @rt)
           AND col.name = @c
    )
    AND NOT EXISTS (SELECT 1 FROM sys.objects WHERE name = @name)
    BEGIN
        SET @sql = N'ALTER TABLE [dbo].' + QUOTENAME(@t) + N' WITH CHECK ADD CONSTRAINT ' + QUOTENAME(@name)
                 + N' FOREIGN KEY (' + QUOTENAME(@c) + N') REFERENCES [dbo].' + QUOTENAME(@rt) + N' (' + QUOTENAME(@rc) + N')'
                 + CASE WHEN @del = N'CASCADE' THEN N' ON DELETE CASCADE' ELSE N'' END + N';';
        BEGIN TRY
            EXEC sp_executesql @sql;
        END TRY
        BEGIN CATCH
            PRINT N'WARNING: ' + @name + N' added WITH NOCHECK - existing rows in ' + @t + N'.' + @c
                + N' point to missing ' + @rt + N' rows. (' + ERROR_MESSAGE() + N')';
            SET @sql = REPLACE(@sql, N' WITH CHECK ADD ', N' WITH NOCHECK ADD ');
            EXEC sp_executesql @sql;
        END CATCH
    END
    FETCH NEXT FROM fk_cursor INTO @name, @t, @c, @rt, @rc, @del;
END
CLOSE fk_cursor;
DEALLOCATE fk_cursor;
GO

/* =====================================================================
   4) INDEXES
   ===================================================================== */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_ContractMaster_Vendor_ContractNo' AND object_id = OBJECT_ID(N'[dbo].[ContractMaster]'))
    CREATE UNIQUE NONCLUSTERED INDEX [UQ_ContractMaster_Vendor_ContractNo] ON [dbo].[ContractMaster] ([VendorID] ASC, [ContractNo] ASC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ContractMasterVendor' AND object_id = OBJECT_ID(N'[dbo].[ContractMaster]'))
    CREATE NONCLUSTERED INDEX [IX_ContractMasterVendor] ON [dbo].[ContractMaster] ([VendorID] ASC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ContractMasterStatus' AND object_id = OBJECT_ID(N'[dbo].[ContractMaster]'))
    CREATE NONCLUSTERED INDEX [IX_ContractMasterStatus] ON [dbo].[ContractMaster] ([StatusID] ASC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ContractMaster_Vendor_Type_Status' AND object_id = OBJECT_ID(N'[dbo].[ContractMaster]'))
    CREATE NONCLUSTERED INDEX [IX_ContractMaster_Vendor_Type_Status] ON [dbo].[ContractMaster] ([VendorID], [ContractType], [Status]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ContractRateMatrixDestination' AND object_id = OBJECT_ID(N'[dbo].[ContractRateMatrix]'))
    CREATE NONCLUSTERED INDEX [IX_ContractRateMatrixDestination] ON [dbo].[ContractRateMatrix] ([DestinationID] ASC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ContractRateMatrixVehicle' AND object_id = OBJECT_ID(N'[dbo].[ContractRateMatrix]'))
    CREATE NONCLUSTERED INDEX [IX_ContractRateMatrixVehicle] ON [dbo].[ContractRateMatrix] ([VehicleTypeID] ASC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ContractCharges_Contract_Code' AND object_id = OBJECT_ID(N'[dbo].[ContractCharges]'))
    CREATE NONCLUSTERED INDEX [IX_ContractCharges_Contract_Code] ON [dbo].[ContractCharges] ([ContractID], [ChargeCode]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_DestinationMaster_City_State' AND object_id = OBJECT_ID(N'[dbo].[DestinationMaster]'))
    CREATE UNIQUE NONCLUSTERED INDEX [UQ_DestinationMaster_City_State] ON [dbo].[DestinationMaster] ([City] ASC, [State] ASC);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_UserLocationPermission_UserPlant' AND object_id = OBJECT_ID(N'[dbo].[UserLocationPermission]'))
    CREATE UNIQUE NONCLUSTERED INDEX [UQ_UserLocationPermission_UserPlant] ON [dbo].[UserLocationPermission] ([UserID], [PlantID]) WHERE [PlantID] IS NOT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_UserLocationPermission_UserLocation' AND object_id = OBJECT_ID(N'[dbo].[UserLocationPermission]'))
    CREATE UNIQUE NONCLUSTERED INDEX [UQ_UserLocationPermission_UserLocation] ON [dbo].[UserLocationPermission] ([UserID], [LocationID]) WHERE [LocationID] IS NOT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLogsUser' AND object_id = OBJECT_ID(N'[dbo].[AuditLogs]'))
    CREATE NONCLUSTERED INDEX [IX_AuditLogsUser] ON [dbo].[AuditLogs] ([UserID]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Notifications_UserID_CreatedAt' AND object_id = OBJECT_ID(N'[dbo].[Notifications]'))
    CREATE NONCLUSTERED INDEX [IX_Notifications_UserID_CreatedAt] ON [dbo].[Notifications] ([UserID], [CreatedAt] DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PasswordHistories_UserID' AND object_id = OBJECT_ID(N'[dbo].[PasswordHistories]'))
    CREATE NONCLUSTERED INDEX [IX_PasswordHistories_UserID] ON [dbo].[PasswordHistories] ([UserID], [createdAt] DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PasswordOtps_UserID' AND object_id = OBJECT_ID(N'[dbo].[PasswordOtps]'))
    CREATE NONCLUSTERED INDEX [IX_PasswordOtps_UserID] ON [dbo].[PasswordOtps] ([UserID], [Purpose], [createdAt] DESC);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_InvoiceDrafts_UserID' AND object_id = OBJECT_ID(N'[dbo].[InvoiceDrafts]'))
    CREATE NONCLUSTERED INDEX [IX_InvoiceDrafts_UserID] ON [dbo].[InvoiceDrafts] ([UserID]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_InvoiceDraftShares_UserID' AND object_id = OBJECT_ID(N'[dbo].[InvoiceDraftShares]'))
    CREATE NONCLUSTERED INDEX [IX_InvoiceDraftShares_UserID] ON [dbo].[InvoiceDraftShares] ([UserID]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ApprovalWorkflowStepUsers_UserID' AND object_id = OBJECT_ID(N'[dbo].[ApprovalWorkflowStepUsers]'))
    CREATE NONCLUSTERED INDEX [IX_ApprovalWorkflowStepUsers_UserID] ON [dbo].[ApprovalWorkflowStepUsers] ([UserID]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_InvoiceApprovalTasks_User_Status' AND object_id = OBJECT_ID(N'[dbo].[InvoiceApprovalTasks]'))
    CREATE NONCLUSTERED INDEX [IX_InvoiceApprovalTasks_User_Status] ON [dbo].[InvoiceApprovalTasks] ([AssignedUserID], [TaskStatus]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_InvoiceApprovalTasks_InvoiceID' AND object_id = OBJECT_ID(N'[dbo].[InvoiceApprovalTasks]'))
    CREATE NONCLUSTERED INDEX [IX_InvoiceApprovalTasks_InvoiceID] ON [dbo].[InvoiceApprovalTasks] ([InvoiceID]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_InvoiceWorkflowEvents_InvoiceID' AND object_id = OBJECT_ID(N'[dbo].[InvoiceWorkflowEvents]'))
    CREATE NONCLUSTERED INDEX [IX_InvoiceWorkflowEvents_InvoiceID] ON [dbo].[InvoiceWorkflowEvents] ([InvoiceID], [EventAt]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_MasterApprovalApprovers_UserID' AND object_id = OBJECT_ID(N'[dbo].[MasterApprovalApprovers]'))
    CREATE NONCLUSTERED INDEX [IX_MasterApprovalApprovers_UserID] ON [dbo].[MasterApprovalApprovers] ([UserID]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_MasterChangeRequests_Status' AND object_id = OBJECT_ID(N'[dbo].[MasterChangeRequests]'))
    CREATE NONCLUSTERED INDEX [IX_MasterChangeRequests_Status] ON [dbo].[MasterChangeRequests] ([Status], [ModuleKey], [ActionType]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_MasterChangeRequests_RequestedBy' AND object_id = OBJECT_ID(N'[dbo].[MasterChangeRequests]'))
    CREATE NONCLUSTERED INDEX [IX_MasterChangeRequests_RequestedBy] ON [dbo].[MasterChangeRequests] ([RequestedBy]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_MasterChangeRequests_Record' AND object_id = OBJECT_ID(N'[dbo].[MasterChangeRequests]'))
    CREATE NONCLUSTERED INDEX [IX_MasterChangeRequests_Record] ON [dbo].[MasterChangeRequests] ([ModuleKey], [RecordID], [Status]);
GO

/* =====================================================================
   5) DROP TABLES THE APPLICATION NO LONGER USES (migration_v18)
   ===================================================================== */
DROP TABLE IF EXISTS [dbo].[RolePermissions];
DROP TABLE IF EXISTS [dbo].[Permissions];
DROP TABLE IF EXISTS [dbo].[ContractRules];
DROP TABLE IF EXISTS [dbo].[ContractDestinations];
DROP TABLE IF EXISTS [dbo].[InvoiceCharges];
DROP TABLE IF EXISTS [dbo].[InvoiceDocuments];
DROP TABLE IF EXISTS [dbo].[InvoiceStatusHistory];
DROP TABLE IF EXISTS [dbo].[VerificationErrors];
DROP TABLE IF EXISTS [dbo].[EmailLogs];
DROP TABLE IF EXISTS [dbo].[Freight_Invoices];
GO

/* =====================================================================
   6) SEED DATA
   ===================================================================== */
-- Roles. "Admin" must exist with exactly this name (server/constants/roles.js).
IF NOT EXISTS (SELECT 1 FROM [dbo].[Roles] WHERE [RoleName] = 'Admin')
    INSERT INTO [dbo].[Roles] ([RoleName], [Description], [IsActive]) VALUES ('Admin', 'Full administrator', 1);
IF NOT EXISTS (SELECT 1 FROM [dbo].[Roles] WHERE [RoleName] = 'User')
    INSERT INTO [dbo].[Roles] ([RoleName], [Description], [IsActive]) VALUES ('User', 'Invoice data entry user', 1);
IF NOT EXISTS (SELECT 1 FROM [dbo].[Roles] WHERE [RoleName] = 'HOD')
    INSERT INTO [dbo].[Roles] ([RoleName], [Description], [IsActive]) VALUES ('HOD', 'Head of Department - invoice approver', 1);
UPDATE [dbo].[Roles] SET [IsActive] = 1 WHERE [RoleName] IN ('Admin', 'User', 'HOD');
GO

-- The old "Administration" role is retired: its users move to "User" (v14).
IF EXISTS (SELECT 1 FROM [dbo].[Roles] WHERE [RoleName] = 'Administration')
BEGIN
    UPDATE u
       SET u.[RoleID] = (SELECT [RoleID] FROM [dbo].[Roles] WHERE [RoleName] = 'User')
      FROM [dbo].[Users] u
      JOIN [dbo].[Roles] r ON r.[RoleID] = u.[RoleID]
     WHERE r.[RoleName] = 'Administration';
    UPDATE [dbo].[Roles] SET [IsActive] = 0 WHERE [RoleName] = 'Administration';
END
GO

-- First Admin user, only when no Admin user exists yet.
-- CHANGE THESE TWO VALUES before running. The password is set afterwards
-- with:  node scripts/setAdminPassword.js <AdminEmail>   (from server/)
DECLARE @AdminEmail    nvarchar(200) = N'admin@company.com';
DECLARE @AdminFullName nvarchar(200) = N'Administrator';

IF NOT EXISTS (SELECT 1 FROM [dbo].[Users] u
               JOIN [dbo].[Roles] r ON r.[RoleID] = u.[RoleID]
               WHERE r.[RoleName] = 'Admin')
   AND NOT EXISTS (SELECT 1 FROM [dbo].[Users] WHERE [Email] = @AdminEmail)
BEGIN
    INSERT INTO [dbo].[Users] ([RoleID], [FullName], [Email], [PasswordHash], [IsActive], [MustChangePassword])
    SELECT [RoleID], @AdminFullName, @AdminEmail, NULL, 1, 1
      FROM [dbo].[Roles] WHERE [RoleName] = 'Admin';
    PRINT N'Admin user created: ' + @AdminEmail;
END
GO

PRINT N'Freight_Invoice_DB is ready.';
GO
