/* =====================================================================
   migration_v8.sql - Direct access to hierarchy locations

   Run against FreightContractDB after migration_v3.sql. This allows
   access requests and permissions to target PlantLocations directly
   when a location has no linked row in the legacy Plants table.
   Safe to re-run.
   ===================================================================== */

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[AccessRequest]') AND name = 'LocationID'
)
BEGIN
    ALTER TABLE [dbo].[AccessRequest] ADD [LocationID] [int] NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK_AccessRequest_PlantLocations'
      AND parent_object_id = OBJECT_ID(N'[dbo].[AccessRequest]')
)
BEGIN
    ALTER TABLE [dbo].[AccessRequest] WITH CHECK ADD CONSTRAINT [FK_AccessRequest_PlantLocations]
        FOREIGN KEY([LocationID]) REFERENCES [dbo].[PlantLocations] ([LocationID]);
    ALTER TABLE [dbo].[AccessRequest] CHECK CONSTRAINT [FK_AccessRequest_PlantLocations];
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[UserLocationPermission]') AND name = 'LocationID'
)
BEGIN
    ALTER TABLE [dbo].[UserLocationPermission] ADD [LocationID] [int] NULL;
END
GO

IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[UserLocationPermission]')
      AND name = 'PlantID' AND is_nullable = 0
)
BEGIN
    ALTER TABLE [dbo].[UserLocationPermission] ALTER COLUMN [PlantID] [int] NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK_UserLocationPermission_PlantLocations'
      AND parent_object_id = OBJECT_ID(N'[dbo].[UserLocationPermission]')
)
BEGIN
    ALTER TABLE [dbo].[UserLocationPermission] WITH CHECK ADD CONSTRAINT [FK_UserLocationPermission_PlantLocations]
        FOREIGN KEY([LocationID]) REFERENCES [dbo].[PlantLocations] ([LocationID]);
    ALTER TABLE [dbo].[UserLocationPermission] CHECK CONSTRAINT [FK_UserLocationPermission_PlantLocations];
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UQ_UserLocationPermission_UserLocation'
      AND object_id = OBJECT_ID(N'[dbo].[UserLocationPermission]')
)
BEGIN
    CREATE UNIQUE INDEX [UQ_UserLocationPermission_UserLocation]
        ON [dbo].[UserLocationPermission] ([UserID], [LocationID])
        WHERE [LocationID] IS NOT NULL;
END
GO
