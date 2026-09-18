-- 1. Company Table (Top of Hierarchy)
CREATE TABLE [dbo].[Companies] (
    [CompanyID] INT IDENTITY(1,1) NOT NULL,
    [CompanyName] NVARCHAR(200) NOT NULL,
    [CompanyCode] VARCHAR(50) NULL,
    [IsActive] BIT DEFAULT(1),
    [CreatedAt] DATETIME DEFAULT(GETDATE()),
    PRIMARY KEY CLUSTERED ([CompanyID] ASC),
    UNIQUE NONCLUSTERED ([CompanyName] ASC)
);
GO

-- 2. SBU Table (Strategic Business Unit - Under Company)
CREATE TABLE [dbo].[SBUs] (
    [SBUID] INT IDENTITY(1,1) NOT NULL,
    [CompanyID] INT NOT NULL,
    [SBUName] NVARCHAR(200) NOT NULL,
    [IsActive] BIT DEFAULT(1),
    [CreatedAt] DATETIME DEFAULT(GETDATE()),
    PRIMARY KEY CLUSTERED ([SBUID] ASC),
    FOREIGN KEY ([CompanyID]) REFERENCES [dbo].[Companies]([CompanyID])
);
GO

-- 3. Plant Table (Under SBU)
CREATE TABLE [dbo].[PlantsHierarchy] (
    [PlantHierarchyID] INT IDENTITY(1,1) NOT NULL,
    [SBUID] INT NOT NULL,
    [PlantName] NVARCHAR(200) NOT NULL,
    [PlantCode] VARCHAR(50) NULL,
    [IsActive] BIT DEFAULT(1),
    [CreatedAt] DATETIME DEFAULT(GETDATE()),
    PRIMARY KEY CLUSTERED ([PlantHierarchyID] ASC),
    FOREIGN KEY ([SBUID]) REFERENCES [dbo].[SBUs]([SBUID])
);
GO

-- 4. Plant Location Table (Under Plant)
CREATE TABLE [dbo].[PlantLocations] (
    [LocationID] INT IDENTITY(1,1) NOT NULL,
    [PlantHierarchyID] INT NOT NULL,
    [LocationName] NVARCHAR(200) NOT NULL,
    [Address] NVARCHAR(200) NULL,
    [IsActive] BIT DEFAULT(1),
    [CreatedAt] DATETIME DEFAULT(GETDATE()),
    PRIMARY KEY CLUSTERED ([LocationID] ASC),
    FOREIGN KEY ([PlantHierarchyID]) REFERENCES [dbo].[PlantsHierarchy]([PlantHierarchyID])
);
GO

-- 5. Responsible User for Approval Configuration Table
CREATE TABLE [dbo].[ApprovalConfig] (
    [ConfigID] INT IDENTITY(1,1) NOT NULL,
    [CompanyID] INT NULL,
    [SBUID] INT NULL,
    [PlantHierarchyID] INT NULL,
    [LocationID] INT NULL,
    [PrimaryUserID] INT NOT NULL,         -- Selected User for Approval
    [PrimaryEmail] NVARCHAR(200) NOT NULL,  -- Auto-populated Email
    [OptionalUserID] INT NULL,            -- Optional User
    [OptionalEmail] NVARCHAR(200) NULL,     -- Optional User Email
    [IsPrimaryActive] BIT DEFAULT(1),     -- Active toggle for sending mail
    [IsOptionalActive] BIT DEFAULT(1),    -- Active toggle for sending mail
    [CreatedAt] DATETIME DEFAULT(GETDATE()),
    PRIMARY KEY CLUSTERED ([ConfigID] ASC),
    FOREIGN KEY ([PrimaryUserID]) REFERENCES [dbo].[Users]([UserID]),
    FOREIGN KEY ([OptionalUserID]) REFERENCES [dbo].[Users]([UserID])
);
GO