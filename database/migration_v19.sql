/* =====================================================================
   migration_v19.sql - Account lockout after wrong passwords

   Run against FreightContractDB after migration_v18.sql. Safe to re-run:
   every change is guarded.

   1) Users.FailedLoginCount
      Wrong passwords in a row since the last successful sign-in.

   2) Users.LockedUntil
      Set to 30 minutes ahead when the 3rd wrong password in a row is
      entered; sign-in is refused until then. An admin's "E-mail new
      password" clears it straight away.

   Password expiry (90 days) needs no new column: it uses the existing
   Users.PasswordChangedAt (migration_v17).

   See server/services/loginLockout.service.js.
   ===================================================================== */

-- 1) Users.FailedLoginCount --------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND name = 'FailedLoginCount')
BEGIN
    ALTER TABLE [dbo].[Users] ADD [FailedLoginCount] [int] NOT NULL
        CONSTRAINT [DF_Users_FailedLoginCount] DEFAULT (0) WITH VALUES;
END
GO

-- 2) Users.LockedUntil -------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND name = 'LockedUntil')
BEGIN
    ALTER TABLE [dbo].[Users] ADD [LockedUntil] [datetime] NULL;
END
GO
