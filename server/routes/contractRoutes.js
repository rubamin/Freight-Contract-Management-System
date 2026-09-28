const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const contractController = require("../controllers/contract.controller");

const router = express.Router();

// Apply authentication middleware to all contract master endpoints
router.use(authMiddleware);

// 1. List contracts with pagination & filtering parameters
router.get("/", contractController.listContracts);

// 2. Fetch detailed record of a single contract by ID
router.get("/:id", contractController.getContract);

// 3. Create a new contract alongside the Excel rate matrix sheet parsing engine
router.post(
  "/",
  contractController.uploadExcel, 
  contractController.createContract
);

// 4. Update an existing contract and re-process the matrix entries if a new sheet is provided
router.put(
  "/:id",
  contractController.uploadExcel, 
  contractController.updateContract
);

// 5. Remove a contract master record and clear cascade tables completely
router.delete("/:id", contractController.deleteContract);

router.get("/rate-matrix/:id", contractController.getRateMatrix);


// Add this route alongside your existing contract routes
router.put(
  "/rate-matrix/bulk-update/:id", 
  // authMiddleware.protect, // Add your authentication token verification middleware here if needed
  contractController.bulkUpdateRateMatrix
);
module.exports = router;