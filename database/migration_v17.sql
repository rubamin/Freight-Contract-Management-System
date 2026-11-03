/* =====================================================================
   migration_v17.sql - Secure login

   Run against FreightContractDB after migration_v16.sql. Safe to re-run:
   every change is guarded.

   1) Users.MustChangePassword
      1 = the user must set their own password before anything else
      opens (new account, admin reset). Every existing user gets 1, so
      everyone sets a new password at their next sign-in.

   2) Users.PasswordChangedAt
      Moves forward on every password change; sessions issued before it
      are rejected.

   3) PasswordHistories
      bcrypt hashes of replaced passwords (the newest 3 are kept) so a
      recent password can't be reused.

   4) PasswordOtps
      Forgot-password codes, stored only as a bcrypt hash. Valid 10
      minutes, single use, max 5 wrong tries.

   See server/services/password.service.js and otp.service.js.
   ===================================================================== */

-- 1) Users.MustChangePassword ------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND name = 'MustChangePassword')
BEGIN
    ALTER TABLE [dbo].[Users] ADD [MustChangePassword] [bit] NOT NULL
        CONSTRAINT [DF_Users_MustChangePassword] DEFAULT (1) WITH VALUES;
END
GO

-- 2) Users.PasswordChangedAt -------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND name = 'PasswordChangedAt')
BEGIN
    ALTER TABLE [dbo].[Users] ADD [PasswordChangedAt] [datetime] NULL;
END
GO

-- 3) PasswordHistories -------------------------------------------------------
IF OBJECT_ID(N'[dbo].[PasswordHistories]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[PasswordHistories](
        [PasswordHistoryID] [int] IDENTITY(1,1) NOT NULL,
        [UserID] [int] NOT NULL,
        [PasswordHash] [nvarchar](255) NOT NULL,
        [createdAt] [datetime] NOT NULL CONSTRAINT [DF_PasswordHistories_createdAt] DEFAULT (GETDATE()),
        [updatedAt] [datetime] NOT NULL CONSTRAINT [DF_PasswordHistories_updatedAt] DEFAULT (GETDATE()),
        CONSTRAINT [PK_PasswordHistories] PRIMARY KEY CLUSTERED ([PasswordHistoryID] ASC),
        CONSTRAINT [FK_PasswordHistories_Users] FOREIGN KEY ([UserID]) REFERENCES [dbo].[Users] ([UserID])
    );
    CREATE NONCLUSTERED INDEX [IX_PasswordHistories_UserID] ON [dbo].[PasswordHistories] ([UserID], [createdAt] DESC);
END
GO

-- 4) PasswordOtps ------------------------------------------------------------
IF OBJECT_ID(N'[dbo].[PasswordOtps]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[PasswordOtps](
        [PasswordOtpID] [int] IDENTITY(1,1) NOT NULL,
        [UserID] [int] NOT NULL,
        [Purpose] [varchar](30) NOT NULL,
        [OtpHash] [nvarchar](255) NOT NULL,
        [ExpiresAt] [datetime] NOT NULL,
        [Attempts] [int] NOT NULL CONSTRAINT [DF_PasswordOtps_Attempts] DEFAULT (0),
        [UsedAt] [datetime] NULL,
        [createdAt] [datetime] NOT NULL CONSTRAINT [DF_PasswordOtps_createdAt] DEFAULT (GETDATE()),
        [updatedAt] [datetime] NOT NULL CONSTRAINT [DF_PasswordOtps_updatedAt] DEFAULT (GETDATE()),
        CONSTRAINT [PK_PasswordOtps] PRIMARY KEY CLUSTERED ([PasswordOtpID] ASC),
        CONSTRAINT [FK_PasswordOtps_Users] FOREIGN KEY ([UserID]) REFERENCES [dbo].[Users] ([UserID])
    );
    CREATE NONCLUSTERED INDEX [IX_PasswordOtps_UserID] ON [dbo].[PasswordOtps] ([UserID], [Purpose], [createdAt] DESC);
END
GO
