/* =====================================================================
   migration_v6.sql — Fix Round 5

   Run this against the same FreightContractDB database that already has
   migration_v2.sql, migration_v3.sql, "Migration v4.sql", and
   migration_v5.sql applied. Written to be safely re-run (checked with
   IF NOT EXISTS) in case it's run more than once.
   ===================================================================== */

/* ---------------------------------------------------------------------
   1) Add InvoiceHeader.LocationID (nullable FK to PlantLocations)

   Invoices only ever stored PlantID (a Plants master row) plus a
   free-text LocationName snapshot - there was no real link back to the
   Location (PlantLocations) the user actually picked on the Add Invoice
   page's Step 1 hierarchy. Whenever no Plants row happened to be linked
   to that Location, the invoice's Location silently fell back to
   whichever Plants row resolveValidPlant defaulted to, regardless of
   what the user selected. This column lets the invoice controllers
   persist that real selection directly, independent of the Plants table.
   --------------------------------------------------------------------- */
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[InvoiceHeader]') AND name = 'LocationID'
)
BEGIN
    ALTER TABLE [dbo].[InvoiceHeader] ADD [LocationID] [int] NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK_InvoiceHeader_PlantLocations' AND parent_object_id = OBJECT_ID(N'[dbo].[InvoiceHeader]')
)
BEGIN
    ALTER TABLE [dbo].[InvoiceHeader] WITH CHECK ADD CONSTRAINT [FK_InvoiceHeader_PlantLocations]
        FOREIGN KEY([LocationID]) REFERENCES [dbo].[PlantLocations] ([LocationID]);
    ALTER TABLE [dbo].[InvoiceHeader] CHECK CONSTRAINT [FK_InvoiceHeader_PlantLocations];
END
GO