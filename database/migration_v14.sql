/* =====================================================================
   migration_v14.sql - Roles, dynamic approval workflow, invoice tracking

   Run against FreightContractDB after migration_v13.sql. Safe to re-run:
   every change is guarded, and the one-time data moves only run in the
   same batch that creates their table or column.

   1) Roles
      Adds the "User" and "HOD" roles. The "Administration" role is
      retired: its users move to "User" and the role is deactivated (it
      stays in the table because old audit rows may reference it). The
      "Admin" role is untouched.

   2) ApprovalWorkflowSteps / ApprovalWorkflowStepUsers
      Ordered approval steps of one location (e.g. 1 = HOD, 2 = Accounts)
      and the users assigned to each step.
        StepType   APPROVAL - the step must approve before the next one
                   NOTIFY   - the step only receives the invoice
        AssignMode UPLOADER_SELECTS - the uploader picks one of the step
                                      users on Add Invoice (e.g. HOD)
                   ALL_USERS        - every step user receives it and any
                                      one of them can act (e.g. Accounts)

   3) ApprovalWorkflowSettings
      Per location: at which step each audit outcome starts.
        DiscrepancyStartStep    - required once steps exist
        SystemApprovedStartStep - NULL = no routing
        PreApprovedStartStep    - NULL = no routing

   4) Existing ApprovalConfig rows become step 1 "HOD Approval"
      (APPROVAL, UPLOADER_SELECTS) with the active primary / optional
      users, and discrepancies start at step 1. ApprovalConfig itself is
      kept for reference but is no longer read by the application.

   5) InvoiceHeader approval tracking columns
      ApprovalStatus, CurrentStepOrder, SelectedApproverUserID,
      DraftCreatedAt, SubmittedForApprovalAt, FinalApprovedAt,
      FinalApprovedBy. Existing invoices get a status from their audit.

   6) InvoiceApprovalTasks / InvoiceWorkflowEvents
      One task per assigned user per step, and a full event history of
      every invoice (created, draft, submitted, approved, rejected...).
   ===================================================================== */

-- 1) Roles --------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[Roles] WHERE [RoleName] = 'User')
    INSERT INTO [dbo].[Roles] ([RoleName], [Description], [IsActive]) VALUES ('User', 'Invoice data entry user', 1);
IF NOT EXISTS (SELECT 1 FROM [dbo].[Roles] WHERE [RoleName] = 'HOD')
    INSERT INTO [dbo].[Roles] ([RoleName], [Description], [IsActive]) VALUES ('HOD', 'Head of Department - invoice approver', 1);
UPDATE [dbo].[Roles] SET [IsActive] = 1 WHERE [RoleName] IN ('User', 'HOD');
GO

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

-- 2) Workflow steps ------------------------------------------------------
IF OBJECT_ID(N'[dbo].[ApprovalWorkflowSteps]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ApprovalWorkflowSteps](
        [StepID] [int] IDENTITY(1,1) NOT NULL,
        [LocationID] [int] NOT NULL,
        [StepOrder] [int] NOT NULL,
        [StepName] [nvarchar](100) NOT NULL,
        [StepType] [varchar](20) NOT NULL,
        [AssignMode] [varchar](20) NOT NULL,
        [CreatedAt] [datetime] NOT NULL CONSTRAINT [DF_ApprovalWorkflowSteps_CreatedAt] DEFAULT (GETDATE()),
        [UpdatedBy] [int] NULL,
        CONSTRAINT [PK_ApprovalWorkflowSteps] PRIMARY KEY CLUSTERED ([StepID] ASC),
        CONSTRAINT [FK_ApprovalWorkflowSteps_PlantLocations] FOREIGN KEY ([LocationID]) REFERENCES [dbo].[PlantLocations] ([LocationID]),
        CONSTRAINT [UQ_ApprovalWorkflowSteps_Location_Order] UNIQUE ([LocationID], [StepOrder]),
        CONSTRAINT [CK_ApprovalWorkflowSteps_StepType] CHECK ([StepType] IN ('APPROVAL', 'NOTIFY')),
        CONSTRAINT [CK_ApprovalWorkflowSteps_AssignMode] CHECK ([AssignMode] IN ('UPLOADER_SELECTS', 'ALL_USERS'))
    );
END
GO

IF OBJECT_ID(N'[dbo].[ApprovalWorkflowStepUsers]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ApprovalWorkflowStepUsers](
        [StepUserID] [int] IDENTITY(1,1) NOT NULL,
        [StepID] [int] NOT NULL,
        [UserID] [int] NOT NULL,
        CONSTRAINT [PK_ApprovalWorkflowStepUsers] PRIMARY KEY CLUSTERED ([StepUserID] ASC),
        CONSTRAINT [FK_ApprovalWorkflowStepUsers_Steps] FOREIGN KEY ([StepID]) REFERENCES [dbo].[ApprovalWorkflowSteps] ([StepID]) ON DELETE CASCADE,
        CONSTRAINT [FK_ApprovalWorkflowStepUsers_Users] FOREIGN KEY ([UserID]) REFERENCES [dbo].[Users] ([UserID]),
        CONSTRAINT [UQ_ApprovalWorkflowStepUsers] UNIQUE ([StepID], [UserID])
    );
    CREATE NONCLUSTERED INDEX [IX_ApprovalWorkflowStepUsers_UserID] ON [dbo].[ApprovalWorkflowStepUsers] ([UserID]);
END
GO

-- 3) Routing per location -------------------------------------------------
IF OBJECT_ID(N'[dbo].[ApprovalWorkflowSettings]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ApprovalWorkflowSettings](
        [LocationID] [int] NOT NULL,
        [DiscrepancyStartStep] [int] NULL,
        [SystemApprovedStartStep] [int] NULL,
        [PreApprovedStartStep] [int] NULL,
        [UpdatedAt] [datetime] NOT NULL CONSTRAINT [DF_ApprovalWorkflowSettings_UpdatedAt] DEFAULT (GETDATE()),
        [UpdatedBy] [int] NULL,
        CONSTRAINT [PK_ApprovalWorkflowSettings] PRIMARY KEY CLUSTERED ([LocationID] ASC),
        CONSTRAINT [FK_ApprovalWorkflowSettings_PlantLocations] FOREIGN KEY ([LocationID]) REFERENCES [dbo].[PlantLocations] ([LocationID])
    );

    -- 4) Old single-level approvers become step 1 "HOD Approval".
    IF OBJECT_ID(N'[dbo].[ApprovalConfig]', N'U') IS NOT NULL
    BEGIN
        EXEC(N'
        INSERT INTO [dbo].[ApprovalWorkflowSteps] ([LocationID], [StepOrder], [StepName], [StepType], [AssignMode])
        SELECT DISTINCT ac.[LocationID], 1, N''HOD Approval'', ''APPROVAL'', ''UPLOADER_SELECTS''
          FROM [dbo].[ApprovalConfig] ac
         WHERE ac.[LocationID] IS NOT NULL
           AND ((ac.[PrimaryUserID] IS NOT NULL AND ac.[IsPrimaryActive] = 1)
             OR (ac.[OptionalUserID] IS NOT NULL AND ac.[IsOptionalActive] = 1));

        INSERT INTO [dbo].[ApprovalWorkflowStepUsers] ([StepID], [UserID])
        SELECT DISTINCT s.[StepID], x.[UserID]
          FROM [dbo].[ApprovalConfig] ac
          JOIN [dbo].[ApprovalWorkflowSteps] s ON s.[LocationID] = ac.[LocationID] AND s.[StepOrder] = 1
         CROSS APPLY (VALUES
              (CASE WHEN ac.[IsPrimaryActive] = 1 THEN ac.[PrimaryUserID] END),
              (CASE WHEN ac.[IsOptionalActive] = 1 THEN ac.[OptionalUserID] END)
         ) x([UserID])
         WHERE x.[UserID] IS NOT NULL;

        INSERT INTO [dbo].[ApprovalWorkflowSettings] ([LocationID], [DiscrepancyStartStep])
        SELECT DISTINCT [LocationID], 1 FROM [dbo].[ApprovalWorkflowSteps];
        ');
    END
END
GO

-- 5) InvoiceHeader tracking columns ---------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[InvoiceHeader]') AND name = 'ApprovalStatus')
BEGIN
    ALTER TABLE [dbo].[InvoiceHeader] ADD
        [ApprovalStatus] [varchar](30) NULL,
        [CurrentStepOrder] [int] NULL,
        [SelectedApproverUserID] [int] NULL,
        [DraftCreatedAt] [datetime] NULL,
        [SubmittedForApprovalAt] [datetime] NULL,
        [FinalApprovedAt] [datetime] NULL,
        [FinalApprovedBy] [int] NULL;

    -- Existing invoices: status from their stored audit outcome. Old
    -- discrepancies have no tasks yet; "Send Selected Mail" on the
    -- Invoice List starts their workflow.
    EXEC(N'
    UPDATE h
       SET h.[ApprovalStatus] = CASE
               WHEN h.[IsPreApproved] = 1 THEN ''PRE_APPROVED''
               WHEN v.[VerificationStatus] = ''APPROVED'' THEN ''APPROVED''
               ELSE ''PENDING_APPROVAL''
           END
      FROM [dbo].[InvoiceHeader] h
      LEFT JOIN [dbo].[InvoiceVerification] v ON v.[InvoiceID] = h.[InvoiceID];
    ');
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_InvoiceHeader_SelectedApprover')
    ALTER TABLE [dbo].[InvoiceHeader] ADD CONSTRAINT [FK_InvoiceHeader_SelectedApprover]
        FOREIGN KEY ([SelectedApproverUserID]) REFERENCES [dbo].[Users] ([UserID]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_InvoiceHeader_FinalApprovedBy')
    ALTER TABLE [dbo].[InvoiceHeader] ADD CONSTRAINT [FK_InvoiceHeader_FinalApprovedBy]
        FOREIGN KEY ([FinalApprovedBy]) REFERENCES [dbo].[Users] ([UserID]);
GO

-- 6) Tasks and event history ------------------------------------------------
IF OBJECT_ID(N'[dbo].[InvoiceApprovalTasks]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[InvoiceApprovalTasks](
        [TaskID] [bigint] IDENTITY(1,1) NOT NULL,
        [InvoiceID] [bigint] NOT NULL,
        [StepOrder] [int] NOT NULL,
        [StepName] [nvarchar](100) NOT NULL,
        [StepType] [varchar](20) NOT NULL,
        [AssignedUserID] [int] NOT NULL,
        [TaskStatus] [varchar](20) NOT NULL,
        [AssignedAt] [datetime] NOT NULL CONSTRAINT [DF_InvoiceApprovalTasks_AssignedAt] DEFAULT (GETDATE()),
        [ActedAt] [datetime] NULL,
        [ActedBy] [int] NULL,
        [Remarks] [nvarchar](1000) NULL,
        CONSTRAINT [PK_InvoiceApprovalTasks] PRIMARY KEY CLUSTERED ([TaskID] ASC),
        CONSTRAINT [FK_InvoiceApprovalTasks_InvoiceHeader] FOREIGN KEY ([InvoiceID]) REFERENCES [dbo].[InvoiceHeader] ([InvoiceID]),
        CONSTRAINT [FK_InvoiceApprovalTasks_Users] FOREIGN KEY ([AssignedUserID]) REFERENCES [dbo].[Users] ([UserID]),
        CONSTRAINT [CK_InvoiceApprovalTasks_Status] CHECK ([TaskStatus] IN ('PENDING', 'APPROVED', 'REJECTED', 'NOTIFIED', 'CLOSED', 'CANCELLED'))
    );
    CREATE NONCLUSTERED INDEX [IX_InvoiceApprovalTasks_User_Status] ON [dbo].[InvoiceApprovalTasks] ([AssignedUserID], [TaskStatus]);
    CREATE NONCLUSTERED INDEX [IX_InvoiceApprovalTasks_InvoiceID] ON [dbo].[InvoiceApprovalTasks] ([InvoiceID]);
END
GO

IF OBJECT_ID(N'[dbo].[InvoiceWorkflowEvents]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[InvoiceWorkflowEvents](
        [EventID] [bigint] IDENTITY(1,1) NOT NULL,
        [InvoiceID] [bigint] NOT NULL,
        [EventType] [varchar](40) NOT NULL,
        [StepOrder] [int] NULL,
        [StepName] [nvarchar](100) NULL,
        [ActorUserID] [int] NULL,
        [Details] [nvarchar](1000) NULL,
        [EventAt] [datetime] NOT NULL CONSTRAINT [DF_InvoiceWorkflowEvents_EventAt] DEFAULT (GETDATE()),
        CONSTRAINT [PK_InvoiceWorkflowEvents] PRIMARY KEY CLUSTERED ([EventID] ASC),
        CONSTRAINT [FK_InvoiceWorkflowEvents_InvoiceHeader] FOREIGN KEY ([InvoiceID]) REFERENCES [dbo].[InvoiceHeader] ([InvoiceID])
    );
    CREATE NONCLUSTERED INDEX [IX_InvoiceWorkflowEvents_InvoiceID] ON [dbo].[InvoiceWorkflowEvents] ([InvoiceID], [EventAt]);

    -- Existing invoices get their creation event from UploadedDate.
    EXEC(N'
    INSERT INTO [dbo].[InvoiceWorkflowEvents] ([InvoiceID], [EventType], [ActorUserID], [Details], [EventAt])
    SELECT [InvoiceID], ''CREATED'', [UploadedBy], N''Invoice created (recorded before approval tracking existed).'', ISNULL([UploadedDate], GETDATE())
      FROM [dbo].[InvoiceHeader];
    ');
END
GO
