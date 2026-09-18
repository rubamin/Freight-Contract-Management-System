/* =====================================================================
   migration_v4.sql — Fix Round 3

   Run this against the same FreightContractDB database that already has
   migration_v2.sql and migration_v3.sql applied. Written to be safely
   re-run (checked with IF NOT EXISTS) in case it's run more than once.
   ===================================================================== */

/* ---------------------------------------------------------------------
   1) Create AuditLogs table
   crud.service.js writes an audit-trail row on every create/update/
   deactivate/delete performed through the shared module CRUD layer, but
   the backing table was never created - every such request crashed with
   "Cannot read properties of undefined (reading 'create')" because the
   Sequelize model had nothing to attach to.
   --------------------------------------------------------------------- */
IF NOT EXISTS (
    SELECT 1 FROM sys.tables WHERE name = 'AuditLogs'
)
BEGIN
    CREATE TABLE [dbo].[AuditLogs](
        [AuditID] [int] IDENTITY(1,1) NOT NULL,
        [UserID] [int] NULL,
        [TableName] [varchar](100) NOT NULL,
        [RecordID] [int] NULL,
        [ActionType] [varchar](20) NOT NULL,
        [OldData] [text] NULL,
        [NewData] [text] NULL,
        [IPAddress] [varchar](45) NULL,
        [ActionDate] [datetime] NOT NULL DEFAULT (getdate()),
    PRIMARY KEY CLUSTERED
    (
        [AuditID] ASC
    ) WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY]
END
GO