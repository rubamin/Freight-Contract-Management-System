/* =====================================================================
   migration_v5.sql — Fix Round 4

   Run this against the same FreightContractDB database that already has
   migration_v2.sql, migration_v3.sql, and "Migration v4.sql" applied.
   Written to be safely re-run (checked with IF NOT EXISTS) in case it's
   run more than once.
   ===================================================================== */

/* ---------------------------------------------------------------------
   1) Add Plants.LocationID (nullable FK to PlantLocations)
   The plants API could never surface a LocationName from PlantLocations
   because the two tables had no relationship at all - Plants had no
   column referencing PlantLocations. This adds it as nullable so existing
   Plants rows (which predate this column) are unaffected; each Plant can
   optionally be linked to a Location afterward.
   --------------------------------------------------------------------- */
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[Plants]') AND name = 'LocationID'
)
BEGIN
    ALTER TABLE [dbo].[Plants] ADD [LocationID] [int] NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK_Plants_PlantLocations' AND parent_object_id = OBJECT_ID(N'[dbo].[Plants]')
)
BEGIN
    ALTER TABLE [dbo].[Plants] WITH CHECK ADD CONSTRAINT [FK_Plants_PlantLocations]
        FOREIGN KEY([LocationID]) REFERENCES [dbo].[PlantLocations] ([LocationID]);
    ALTER TABLE [dbo].[Plants] CHECK CONSTRAINT [FK_Plants_PlantLocations];
END
GO
