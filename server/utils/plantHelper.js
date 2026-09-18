const { Plant } = require("../models");

/**
 * Resolves a valid Plant record for use anywhere a PlantID foreign key is
 * inserted, or plant details (e.g. PlantName) are needed alongside it.
 *
 * Frontend hierarchy selections (Company -> SBU -> Plant -> Location) do not
 * always map to a real row in the Plants master table by PlantID - the
 * Add/Edit Invoice grid actually sends a PlantLocations.LocationID (see
 * `selectedLocation` in AddInvoice.jsx), which is a different ID space from
 * Plants.PlantID entirely. Plants links to that hierarchy via its own
 * LocationID column (see Plant.js / migration_v5), so a candidate is now
 * tried as a PlantID first, then as a LocationID, before falling back to the
 * provided default plant - previously only the PlantID lookup ran, so a
 * hierarchy Location selection almost never matched and every invoice
 * silently fell back to the default plant regardless of what the user chose.
 *
 * Returning the full record (instead of just the ID) lets callers reuse this
 * single lookup for both PlantID and PlantName instead of querying twice.
 *
 * @param {number|string|null|undefined} candidatePlantId - PlantID or LocationID value to validate.
 * @param {object} defaultPlant - Fallback Plant instance/record (must have PlantID).
 * @param {import("sequelize").Transaction} [transaction] - Optional active transaction.
 * @returns {Promise<object>} A Plant record guaranteed to exist in the Plants table.
 */
const resolveValidPlant = async (candidatePlantId, defaultPlant, transaction) => {
  if (candidatePlantId) {
    const existingPlant = await Plant.findByPk(candidatePlantId, { transaction });
    if (existingPlant) {
      return existingPlant;
    }

    const plantByLocation = await Plant.findOne({ where: { LocationID: candidatePlantId }, transaction });
    if (plantByLocation) {
      return plantByLocation;
    }
  }

  return defaultPlant;
};

module.exports = { resolveValidPlant };