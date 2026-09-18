/* =====================================================================
   FreightContractDB — Full Schema Reference (as of v2)
   =====================================================================
   This is a reference copy of the current schema: the original schema
   script this project was given, with every change from
   database/migration_v2.sql already applied in place (InvoiceHeader:
   VehicleNumber removed, LocationName added; Users: ProfilePhotoUrl
   added; UserPreferences and Notifications tables added).

   NOTE ON HOW THIS WAS PRODUCED: this was assembled from the original
   schema script plus the tracked v2 changes, not generated live via
   SQL Server Management Studio's "Generate Scripts" wizard against a
   running database (no live database connection was available while
   producing this deliverable). Treat it as a reference/documentation
   copy. Before relying on it as the literal source of truth, it's
   worth re-generating this file for real from your actual database
   (right-click the database in SSMS → Tasks → Generate Scripts) and
   diffing against this copy to confirm nothing has drifted.
   ===================================================================== */

USE [FreightContractDB]
GO
/****** Object:  Table [dbo].[ApprovalConfig]    Script Date: 08/20/2026 2:55:41 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ApprovalConfig](
	[ConfigID] [int] IDENTITY(1,1) NOT NULL,
	[CompanyID] [int] NULL,
	[SBUID] [int] NULL,
	[PlantHierarchyID] [int] NULL,
	[PrimaryUserID] [int] NOT NULL,
	[PrimaryEmail] [nvarchar](200) NOT NULL,
	[OptionalUserID] [int] NULL,
	[OptionalEmail] [nvarchar](200) NULL,
	[IsPrimaryActive] [bit] NULL,
	[IsOptionalActive] [bit] NULL,
	[CreatedAt] [datetime] NULL,
	[LocationID] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[ConfigID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Companies]    Script Date: 08/20/2026 2:55:41 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Companies](
	[CompanyID] [int] IDENTITY(1,1) NOT NULL,
	[CompanyName] [nvarchar](200) NOT NULL,
	[IsActive] [bit] NULL,
	[CreatedAt] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[CompanyID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[CompanyName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ContractMaster]    Script Date: 08/20/2026 2:55:41 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ContractMaster](
	[ContractID] [int] IDENTITY(1,1) NOT NULL,
	[ContractNo] [nvarchar](100) NOT NULL,
	[VendorID] [int] NULL,
	[PlantID] [int] NULL,
	[ContractStartDate] [date] NULL,
	[ContractEndDate] [date] NULL,
	[StatusID] [int] NULL,
	[Remarks] [nvarchar](max) NULL,
	[CreatedBy] [int] NULL,
	[CreatedAt] [datetime2](7) NULL,
	[VendorPAN] [varchar](20) NULL,
	[DieselBasePrice] [decimal](18, 2) NULL,
	[DieselRevision] [nvarchar](100) NULL,
	[RateMatrixFileName] [nvarchar](255) NULL,
	[UpdatedBy] [int] NULL,
	[UpdatedAt] [datetime2](7) NULL,
	[Status] [nvarchar](30) NULL,
PRIMARY KEY CLUSTERED 
(
	[ContractID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_ContractMaster_ContractNo] UNIQUE NONCLUSTERED 
(
	[ContractNo] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ContractRateMatrix]    Script Date: 08/20/2026 2:55:41 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ContractRateMatrix](
	[RateID] [int] IDENTITY(1,1) NOT NULL,
	[ContractID] [int] NULL,
	[DestinationID] [int] NULL,
	[VehicleTypeID] [int] NULL,
	[WeightID] [int] NULL,
	[BaseRate] [decimal](18, 2) NULL,
	[PerKMRate] [decimal](18, 2) NULL,
	[FixedRate] [decimal](18, 2) NULL,
	[EffectiveFrom] [date] NULL,
	[EffectiveTo] [date] NULL,
PRIMARY KEY CLUSTERED 
(
	[RateID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UC_Contract_Dest_Vehicle_New] UNIQUE NONCLUSTERED 
(
	[ContractID] ASC,
	[DestinationID] ASC,
	[VehicleTypeID] ASC,
	[WeightID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[DestinationMaster]    Script Date: 08/20/2026 2:55:41 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[DestinationMaster](
	[DestinationID] [int] IDENTITY(1,1) NOT NULL,
	[City] [nvarchar](200) NULL,
	[District] [nvarchar](200) NULL,
	[State] [nvarchar](200) NULL,
	[Pincode] [varchar](10) NULL,
	[IsActive] [bit] NOT NULL DEFAULT (1),
PRIMARY KEY CLUSTERED 
(
	[DestinationID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[City] ASC,
	[State] ASC,
	[Pincode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[InvoiceHeader]    Script Date: 08/20/2026 2:55:41 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[InvoiceHeader](
	[InvoiceID] [bigint] IDENTITY(1,1) NOT NULL,
	[InvoiceNumber] [varchar](100) NOT NULL,
	[InvoiceDate] [date] NOT NULL,
	[VendorID] [int] NOT NULL,
	[VendorGSTID] [int] NULL,
	[PlantID] [int] NOT NULL,
	[ContractID] [int] NULL,
	[LRNumber] [varchar](100) NULL,
	[LRDate] [date] NULL,
	[VehicleTypeID] [int] NULL,
	[TotalWeight] [decimal](18, 2) NULL,
	[DistanceKM] [decimal](18, 2) NULL,
	[BasicFreight] [decimal](18, 2) NULL,
	[OtherCharges] [decimal](18, 2) NULL,
	[GSTAmount] [decimal](18, 2) NULL,
	[TotalInvoiceAmount] [decimal](18, 2) NULL,
	[InvoiceStatusID] [int] NULL,
	[UploadedBy] [int] NULL,
	[UploadedDate] [datetime] NULL,
	[DetainCharges] [decimal](18, 2) NULL,
	[ExtraCharges] [decimal](18, 2) NULL,
	[FromStation] [varchar](100) NULL,
	[ToStation] [varchar](100) NULL,
	[Remarks] [varchar](max) NULL,
	[Doc1Path] [nvarchar](max) NULL,
	[Doc2Path] [nvarchar](max) NULL,
	[Doc3Path] [nvarchar](max) NULL,
	[CustomerName] [nvarchar](255) NULL,
	[LocationName] [varchar](200) NULL,
	[IsPreApproved] [bit] NOT NULL DEFAULT (0),
PRIMARY KEY CLUSTERED 
(
	[InvoiceID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[InvoiceApprovalHistory]    Added in this pass (see migration_v2.sql step 8) ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
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
GO
ALTER TABLE [dbo].[InvoiceApprovalHistory] WITH CHECK ADD CONSTRAINT [FK_InvoiceApprovalHistory_InvoiceHeader] FOREIGN KEY([InvoiceID])
REFERENCES [dbo].[InvoiceHeader] ([InvoiceID])
GO
ALTER TABLE [dbo].[InvoiceApprovalHistory] CHECK CONSTRAINT [FK_InvoiceApprovalHistory_InvoiceHeader]
GO
/****** Object:  Table [dbo].[InvoiceItems]    Script Date: 08/20/2026 2:55:41 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[InvoiceItems](
	[InvoiceItemID] [bigint] IDENTITY(1,1) NOT NULL,
	[InvoiceID] [bigint] NOT NULL,
	[DestinationID] [int] NULL,
	[WeightID] [int] NULL,
	[ActualWeight] [decimal](18, 2) NULL,
	[DistanceKM] [decimal](18, 2) NULL,
	[Rate] [decimal](18, 2) NULL,
	[FreightAmount] [decimal](18, 2) NULL,
PRIMARY KEY CLUSTERED 
(
	[InvoiceItemID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[InvoiceVerification]    Script Date: 08/20/2026 2:55:41 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[InvoiceVerification](
	[VerificationID] [bigint] IDENTITY(1,1) NOT NULL,
	[InvoiceID] [bigint] NULL,
	[ContractID] [int] NULL,
	[ExpectedAmount] [decimal](18, 2) NULL,
	[InvoiceAmount] [decimal](18, 2) NULL,
	[DifferenceAmount] [decimal](18, 2) NULL,
	[VerificationStatus] [varchar](50) NULL,
	[VerifiedBy] [int] NULL,
	[VerifiedDate] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[VerificationID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[PlantLocations]    Script Date: 08/20/2026 2:55:41 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PlantLocations](
	[LocationID] [int] IDENTITY(1,1) NOT NULL,
	[PlantHierarchyID] [int] NULL,
	[LocationName] [varchar](255) NOT NULL,
	[IsActive] [bit] NULL,
	[CreatedAt] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[LocationID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Plants]    Script Date: 08/20/2026 2:55:41 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Plants](
	[PlantID] [int] IDENTITY(1,1) NOT NULL,
	[PlantCode] [varchar](20) NULL,
	[PlantName] [nvarchar](200) NULL,
	[City] [nvarchar](100) NULL,
	[State] [nvarchar](100) NULL,
	[IsActive] [bit] NULL,
PRIMARY KEY CLUSTERED 
(
	[PlantID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[PlantCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[PlantsHierarchy]    Script Date: 08/20/2026 2:55:41 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PlantsHierarchy](
	[PlantHierarchyID] [int] IDENTITY(1,1) NOT NULL,
	[SBUID] [int] NOT NULL,
	[PlantName] [nvarchar](200) NOT NULL,
	[PlantCode] [varchar](50) NULL,
	[IsActive] [bit] NULL,
	[CreatedAt] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[PlantHierarchyID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Roles]    Script Date: 08/20/2026 2:55:41 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Roles](
	[RoleID] [int] IDENTITY(1,1) NOT NULL,
	[RoleName] [nvarchar](100) NOT NULL,
	[Description] [nvarchar](500) NULL,
	[IsActive] [bit] NULL,
	[CreatedAt] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[RoleID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[RoleName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SBUs]    Script Date: 08/20/2026 2:55:41 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SBUs](
	[SBUID] [int] IDENTITY(1,1) NOT NULL,
	[CompanyID] [int] NOT NULL,
	[SBUName] [nvarchar](200) NOT NULL,
	[IsActive] [bit] NULL,
	[CreatedAt] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[SBUID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[StatusMaster]    Script Date: 08/20/2026 2:55:41 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[StatusMaster](
	[StatusID] [int] IDENTITY(1,1) NOT NULL,
	[StatusName] [nvarchar](100) NULL,
	[ModuleName] [nvarchar](100) NULL,
PRIMARY KEY CLUSTERED 
(
	[StatusID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[StatusName] ASC,
	[ModuleName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Users]    Script Date: 08/20/2026 2:55:41 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Users](
	[UserID] [int] IDENTITY(1,1) NOT NULL,
	[RoleID] [int] NOT NULL,
	[FullName] [nvarchar](200) NULL,
	[Email] [nvarchar](200) NOT NULL,
	[PasswordHash] [nvarchar](max) NULL,
	[MobileNo] [varchar](20) NULL,
	[ProfilePhotoUrl] [nvarchar](500) NULL,
	[IsActive] [bit] NULL,
	[LastLogin] [datetime] NULL,
	[CreatedAt] [datetime] NULL,
	[PasswordResetTokenHash] [varchar](255) NULL,
	[PasswordResetExpiresAt] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[UserID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[Email] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[VehicleTypes]    Script Date: 08/20/2026 2:55:41 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[VehicleTypes](
	[VehicleTypeID] [int] IDENTITY(1,1) NOT NULL,
	[VehicleName] [nvarchar](100) NULL,
	[Capacity] [decimal](18, 2) NULL,
	[Unit] [varchar](20) NULL,
	[IsActive] [bit] NOT NULL DEFAULT (1),
PRIMARY KEY CLUSTERED 
(
	[VehicleTypeID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[VehicleName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[VendorGST]    Script Date: 08/20/2026 2:55:41 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[VendorGST](
	[VendorGSTID] [int] IDENTITY(1,1) NOT NULL,
	[VendorID] [int] NULL,
	[GSTNumber] [varchar](30) NULL,
	[StateName] [nvarchar](100) NULL,
	[IsDefault] [bit] NULL,
PRIMARY KEY CLUSTERED 
(
	[VendorGSTID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[VendorID] ASC,
	[GSTNumber] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Vendors]    Script Date: 08/20/2026 2:55:41 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Vendors](
	[VendorID] [int] IDENTITY(1,1) NOT NULL,
	[VendorCode] [varchar](30) NULL,
	[VendorName] [nvarchar](300) NULL,
	[Address] [nvarchar](max) NULL,
	[ContactPerson] [nvarchar](200) NULL,
	[Email] [nvarchar](200) NULL,
	[MobileNo] [varchar](20) NULL,
	[PANNo] [varchar](20) NULL,
	[IsActive] [bit] NULL,
	[CreatedAt] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[VendorID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[VendorCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[WeightMaster]    Script Date: 08/20/2026 2:55:41 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[WeightMaster](
	[WeightID] [int] IDENTITY(1,1) NOT NULL,
	[FromWeight] [decimal](18, 2) NULL,
	[ToWeight] [decimal](18, 2) NULL,
	[WeightUnit] [varchar](20) NULL,
	[IsActive] [bit] NOT NULL DEFAULT (1),
PRIMARY KEY CLUSTERED 
(
	[WeightID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[FromWeight] ASC,
	[ToWeight] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/* =====================================================================
   NEW TABLES ADDED IN v2 (see database/migration_v2.sql for details)
   ===================================================================== */
/****** Object:  Table [dbo].[UserPreferences]    Added in v2 ******/
CREATE TABLE [dbo].[UserPreferences] (
	[UserID] [int] NOT NULL PRIMARY KEY,
	[NotificationEmailEnabled] [bit] NOT NULL DEFAULT (1),
	[NotificationSoundEnabled] [bit] NOT NULL DEFAULT (1),
	[DefaultPlantID] [int] NULL,
	[DefaultPlantIDs] [nvarchar](max) NULL,
	[UpdatedAt] [datetime] NULL DEFAULT (getdate()),
	CONSTRAINT [FK_UserPreferences_Users] FOREIGN KEY ([UserID])
		REFERENCES [dbo].[Users]([UserID]),
	CONSTRAINT [FK_UserPreferences_Plants] FOREIGN KEY ([DefaultPlantID])
		REFERENCES [dbo].[Plants]([PlantID])
)
GO
/****** Object:  Table [dbo].[Notifications]    Added in v2 ******/
CREATE TABLE [dbo].[Notifications] (
	[NotificationID] [bigint] IDENTITY(1,1) NOT NULL PRIMARY KEY,
	[Type] [varchar](50) NOT NULL,
	[Message] [varchar](500) NOT NULL,
	[RelatedInvoiceID] [bigint] NULL,
	[CreatedAt] [datetime] NULL DEFAULT (getdate()),
	CONSTRAINT [FK_Notifications_InvoiceHeader] FOREIGN KEY ([RelatedInvoiceID])
		REFERENCES [dbo].[InvoiceHeader]([InvoiceID])
)
GO
/****** Object:  Table [dbo].[CustomerMaster]    Added in this pass (see migration_v2.sql step 9) ******/
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
GO
/****** Object:  Table [dbo].[UserModulePermission]    Added in this pass (see migration_v2.sql step 10) ******/
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
GO
ALTER TABLE [dbo].[UserModulePermission] WITH CHECK ADD CONSTRAINT [FK_UserModulePermission_Users] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[UserModulePermission] CHECK CONSTRAINT [FK_UserModulePermission_Users]
GO
/****** Object:  Table [dbo].[UserLocationPermission]    Added in this pass (see migration_v2.sql step 10) ******/
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
GO
ALTER TABLE [dbo].[UserLocationPermission] WITH CHECK ADD CONSTRAINT [FK_UserLocationPermission_Users] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[UserLocationPermission] CHECK CONSTRAINT [FK_UserLocationPermission_Users]
GO
ALTER TABLE [dbo].[UserLocationPermission] WITH CHECK ADD CONSTRAINT [FK_UserLocationPermission_Plants] FOREIGN KEY([PlantID])
REFERENCES [dbo].[Plants] ([PlantID])
GO
ALTER TABLE [dbo].[UserLocationPermission] CHECK CONSTRAINT [FK_UserLocationPermission_Plants]
GO
/* NOTE: [dbo].[RolePermissions] is referenced by the application's
   Sequelize model (server/models/RolePermission.js) but no CREATE TABLE
   statement for it was present in the original schema reference this
   file was built from. If it already exists in your live database,
   this is just a gap in the reference copy, not a missing table. If it
   does not exist, create it from the model definition before relying
   on role-permission features. */
GO
/****** Object:  Index [IX_ContractMasterVendor]    Script Date: 08/20/2026 2:55:41 PM ******/
CREATE NONCLUSTERED INDEX [IX_ContractMasterVendor] ON [dbo].[ContractMaster]
(
	[VendorID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_ContractRateMatrixDestination]    Script Date: 08/20/2026 2:55:41 PM ******/
CREATE NONCLUSTERED INDEX [IX_ContractRateMatrixDestination] ON [dbo].[ContractRateMatrix]
(
	[DestinationID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_ContractRateMatrixVehicle]    Script Date: 08/20/2026 2:55:41 PM ******/
CREATE NONCLUSTERED INDEX [IX_ContractRateMatrixVehicle] ON [dbo].[ContractRateMatrix]
(
	[VehicleTypeID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[ApprovalConfig] ADD  DEFAULT ((1)) FOR [IsPrimaryActive]
GO
ALTER TABLE [dbo].[ApprovalConfig] ADD  DEFAULT ((1)) FOR [IsOptionalActive]
GO
ALTER TABLE [dbo].[ApprovalConfig] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Companies] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Companies] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[ContractMaster] ADD  CONSTRAINT [DF_ContractMaster_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[InvoiceHeader] ADD  DEFAULT (getdate()) FOR [UploadedDate]
GO
ALTER TABLE [dbo].[InvoiceHeader] ADD  DEFAULT ((0)) FOR [DetainCharges]
GO
ALTER TABLE [dbo].[InvoiceHeader] ADD  DEFAULT ((0)) FOR [ExtraCharges]
GO
ALTER TABLE [dbo].[PlantLocations] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[PlantLocations] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Plants] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[PlantsHierarchy] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[PlantsHierarchy] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Roles] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Roles] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[SBUs] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[SBUs] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Users] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Users] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[VendorGST] ADD  DEFAULT ((0)) FOR [IsDefault]
GO
ALTER TABLE [dbo].[Vendors] ADD  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Vendors] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[ApprovalConfig]  WITH CHECK ADD FOREIGN KEY([LocationID])
REFERENCES [dbo].[PlantLocations] ([LocationID])
GO
ALTER TABLE [dbo].[ApprovalConfig]  WITH NOCHECK ADD FOREIGN KEY([OptionalUserID])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[ApprovalConfig]  WITH NOCHECK ADD FOREIGN KEY([PrimaryUserID])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[ContractMaster]  WITH NOCHECK ADD FOREIGN KEY([CreatedBy])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[ContractMaster]  WITH NOCHECK ADD FOREIGN KEY([PlantID])
REFERENCES [dbo].[Plants] ([PlantID])
GO
ALTER TABLE [dbo].[ContractMaster]  WITH NOCHECK ADD FOREIGN KEY([StatusID])
REFERENCES [dbo].[StatusMaster] ([StatusID])
GO
ALTER TABLE [dbo].[ContractMaster]  WITH NOCHECK ADD FOREIGN KEY([VendorID])
REFERENCES [dbo].[Vendors] ([VendorID])
GO
ALTER TABLE [dbo].[ContractRateMatrix]  WITH CHECK ADD FOREIGN KEY([ContractID])
REFERENCES [dbo].[ContractMaster] ([ContractID])
GO
ALTER TABLE [dbo].[ContractRateMatrix]  WITH CHECK ADD FOREIGN KEY([DestinationID])
REFERENCES [dbo].[DestinationMaster] ([DestinationID])
GO
ALTER TABLE [dbo].[ContractRateMatrix]  WITH CHECK ADD FOREIGN KEY([VehicleTypeID])
REFERENCES [dbo].[VehicleTypes] ([VehicleTypeID])
GO
ALTER TABLE [dbo].[ContractRateMatrix]  WITH CHECK ADD FOREIGN KEY([WeightID])
REFERENCES [dbo].[WeightMaster] ([WeightID])
GO
ALTER TABLE [dbo].[InvoiceHeader]  WITH CHECK ADD FOREIGN KEY([ContractID])
REFERENCES [dbo].[ContractMaster] ([ContractID])
GO
ALTER TABLE [dbo].[InvoiceHeader]  WITH CHECK ADD FOREIGN KEY([InvoiceStatusID])
REFERENCES [dbo].[StatusMaster] ([StatusID])
GO
ALTER TABLE [dbo].[InvoiceHeader]  WITH CHECK ADD FOREIGN KEY([PlantID])
REFERENCES [dbo].[Plants] ([PlantID])
GO
ALTER TABLE [dbo].[InvoiceHeader]  WITH CHECK ADD FOREIGN KEY([UploadedBy])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[InvoiceHeader]  WITH CHECK ADD FOREIGN KEY([VehicleTypeID])
REFERENCES [dbo].[VehicleTypes] ([VehicleTypeID])
GO
ALTER TABLE [dbo].[InvoiceHeader]  WITH CHECK ADD FOREIGN KEY([VendorID])
REFERENCES [dbo].[Vendors] ([VendorID])
GO
ALTER TABLE [dbo].[InvoiceHeader]  WITH CHECK ADD FOREIGN KEY([VendorGSTID])
REFERENCES [dbo].[VendorGST] ([VendorGSTID])
GO
ALTER TABLE [dbo].[InvoiceItems]  WITH CHECK ADD FOREIGN KEY([DestinationID])
REFERENCES [dbo].[DestinationMaster] ([DestinationID])
GO
ALTER TABLE [dbo].[InvoiceItems]  WITH CHECK ADD FOREIGN KEY([InvoiceID])
REFERENCES [dbo].[InvoiceHeader] ([InvoiceID])
GO
ALTER TABLE [dbo].[InvoiceItems]  WITH CHECK ADD FOREIGN KEY([WeightID])
REFERENCES [dbo].[WeightMaster] ([WeightID])
GO
ALTER TABLE [dbo].[InvoiceVerification]  WITH NOCHECK ADD FOREIGN KEY([ContractID])
REFERENCES [dbo].[ContractMaster] ([ContractID])
GO
ALTER TABLE [dbo].[InvoiceVerification]  WITH NOCHECK ADD FOREIGN KEY([InvoiceID])
REFERENCES [dbo].[InvoiceHeader] ([InvoiceID])
GO
ALTER TABLE [dbo].[InvoiceVerification]  WITH NOCHECK ADD FOREIGN KEY([VerifiedBy])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[PlantLocations]  WITH CHECK ADD FOREIGN KEY([PlantHierarchyID])
REFERENCES [dbo].[PlantsHierarchy] ([PlantHierarchyID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[PlantsHierarchy]  WITH NOCHECK ADD FOREIGN KEY([SBUID])
REFERENCES [dbo].[SBUs] ([SBUID])
GO
ALTER TABLE [dbo].[SBUs]  WITH NOCHECK ADD FOREIGN KEY([CompanyID])
REFERENCES [dbo].[Companies] ([CompanyID])
GO
ALTER TABLE [dbo].[Users]  WITH NOCHECK ADD FOREIGN KEY([RoleID])
REFERENCES [dbo].[Roles] ([RoleID])
GO
ALTER TABLE [dbo].[VendorGST]  WITH NOCHECK ADD FOREIGN KEY([VendorID])
REFERENCES [dbo].[Vendors] ([VendorID])
GO
