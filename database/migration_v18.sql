/* =====================================================================
   migration_v18.sql - Drop unused tables

   Run against FreightContractDB after migration_v17.sql. Safe to re-run:
   every drop is guarded with IF EXISTS.

   BACK UP FreightContractDB FIRST. Dropped tables and their rows cannot
   be recovered. If any of these tables still holds history you need,
   export it before running this script.

   No application code reads or writes any of these tables (checked
   against every model and raw SQL query in server/):

   - RolePermissions, Permissions   old role scheme, replaced by
                                    UserModulePermission and
                                    UserLocationPermission
   - InvoiceStatusHistory           merged into InvoiceApprovalHistory
                                    (migration_v2.sql step 8)
   - ContractRules, ContractDestinations, InvoiceCharges,
     InvoiceDocuments, VerificationErrors, EmailLogs, Freight_Invoices
                                    left over from the original schema
   ===================================================================== */

-- Child tables first, so no foreign key blocks a drop.
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
