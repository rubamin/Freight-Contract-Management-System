/* =====================================================================
   migration_v7.sql - Fix Round 6

   Run this against the same FreightContractDB database that already has
   migration_v2.sql, migration_v3.sql, "Migration v4.sql", migration_v5.sql,
   and "Migration v6.sql" applied. Written to be safely re-run (checked
   with IF NOT EXISTS) in case it's run more than once.

   THIS IS THE FIX for "Invalid column name 'DistanceKM'": the application
   code (ContractRateMatrix model / rate-matrix Excel parser) already
   expects a DistanceKM column on ContractRateMatrix, but the table itself
   was never altered to add it - so every query that touches
   ContractRateMatrix (including the Contract List and Contract View
   pages) fails at the database level. Run the block below against your
   actual database and the error will stop.
   ===================================================================== */

/* ---------------------------------------------------------------------
   1) Add ContractRateMatrix.DistanceKM (nullable)

   Stores the KM distance for a destination, parsed from the "KM" column
   in the DOMESTIC DESTINATIONS sheet of the Rate Matrix Excel template.
   Nullable because rows from the ADDITIONAL DESTINATIONS sheet (priced by
   vehicle type, not by weight/KM) and manually-added destinations don't
   carry a KM value.
   --------------------------------------------------------------------- */
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[ContractRateMatrix]') AND name = 'DistanceKM'
)
BEGIN
    ALTER TABLE [dbo].[ContractRateMatrix] ADD [DistanceKM] [decimal](18, 2) NULL;
END
GO
