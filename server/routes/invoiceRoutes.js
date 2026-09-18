const express = require("express");
const router = express.Router();
const multer = require("multer");
const invoiceDocumentController = require("../controllers/invoiceDocumentController");
const { getInvoiceMasterSuggestions, createCustomerFromInvoice } = require("../controllers/masterSearchController");
const createModuleRouter = require("./moduleRouteFactory");
const { buildInvoiceFilterWhere } = require("../utils/invoiceFilters");
const authMiddleware = require("../middleware/authMiddleware");
const {
  InvoiceHeader,
  InvoiceItem,
  InvoiceVerification,
  Vendor,
  VendorGST,
  Plant,
  PlantLocation,
  ContractMaster,
  VehicleType,
  StatusMaster,
} = require("../models");

// 1. Force Memory Storage inside this route
const memoryStorage = multer.memoryStorage();
// Use .any() to seamlessly accept dynamic multi-row file keys (e.g. doc1_0, doc1_1, etc.)
const memoryUpload = multer({ storage: memoryStorage });

const registry = {
  invoices: {
    model: InvoiceHeader,
    tableName: "InvoiceHeader",
    primaryKey: "InvoiceID",
    searchFields: ["InvoiceNumber", "LRNumber"],
    sortFields: ["InvoiceID", "InvoiceNumber", "InvoiceDate", "VendorID", "PlantID", "UploadedDate"],
    // Structured filters (date range, vendor, plant, status) shared with the
    // Reports export endpoint via buildInvoiceFilterWhere.
    buildExtraWhere: buildInvoiceFilterWhere,
    include: [
      { model: InvoiceItem, as: "items" },
      { model: InvoiceVerification, as: "verification" },
    ],
  },
  items: { model: InvoiceItem, tableName: "InvoiceItems", primaryKey: "InvoiceItemID", sortFields: ["InvoiceItemID"] },
};

registry.invoices.include.push(
  { model: Vendor, as: "vendor" },
  { model: VendorGST, as: "vendorGST" },
  { model: Plant, as: "plant" },
  // Resolves the real hierarchy Location by InvoiceHeader.LocationID, so
  // Invoice List / Edit Invoice can read the actual selected Location
  // instead of falling back to whatever Plant happened to be linked.
  { model: PlantLocation, as: "location", attributes: ["LocationID", "LocationName"] },
  { model: ContractMaster, as: "contract" },
  { model: VehicleType, as: "vehicleType" },
  { model: StatusMaster, as: "invoiceStatus" }
);

// Generate standard routing definitions
const baseFactoryRouter = createModuleRouter(registry);

// 2. Explicitly bind base endpoints to align with frontend calls without suffix issues
router.get("/", (req, res, next) => {
  req.url = "/invoices" + req.url.substring(1);
  baseFactoryRouter(req, res, next);
});

// Explicit upload engine binding with memory storage parser using .any()
// authMiddleware runs first so req.user (submitting user's own email) is
// populated for the submission-confirmation email logic in the controller.
router.post(
  "/documents/upload",
  authMiddleware,
  memoryUpload.any(), 
  invoiceDocumentController.uploadDocument
);

// NEW: Bulk edit endpoint for the Edit Invoice page. Accepts multipart form
// data (not just JSON) so a row can include a new attachment upload
// alongside its field changes - see EditInvoice.jsx's "+ Upload" control.
router.put(
  "/documents/update",
  authMiddleware,
  memoryUpload.any(),
  invoiceDocumentController.updateInvoices
);

// NEW: Explicit route binding for sending selected invoices summary mail
router.post(
  "/send-mail",
  invoiceDocumentController.sendSelectedInvoicesMail
);

// Specific GET route for suggestions (Will map to GET /api/invoices/invoice-suggestions)
router.get('/invoice-suggestions', getInvoiceMasterSuggestions);

// Inline "+ Add Customer" from the Add Invoice grid (task item 6)
router.post('/customers', createCustomerFromInvoice);

// Fallback for factory-generated sub-routes
router.use(baseFactoryRouter);

module.exports = router;