/* =====================================================================
   migration_v9.sql - Rate Matrix template import

   Run against FreightContractDB after migration_v8.sql. Safe to re-run.

   1) ContractRateMatrix.DistanceKM
      The model now stores the "DISTANCE IN KM" column from both sheets of
      the Rate Matrix template. migration_v7.sql already adds this column;
      it is repeated here (guarded) so databases that skipped v7 do not
      fail with "Invalid column name 'DistanceKM'".

   No data changes are needed: Sheet 1 rows imported before this release
   (WeightID only, no VehicleTypeID) are still matched during the invoice
   audit through their weight slab. Re-uploading a contract with the new
   template links every slab to a Vehicle Type of the same name.
   ===================================================================== */

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[ContractRateMatrix]') AND name = 'DistanceKM'
)
BEGIN
    ALTER TABLE [dbo].[ContractRateMatrix] ADD [DistanceKM] [decimal](18, 2) NULL;
END
GO
