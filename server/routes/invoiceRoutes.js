const express = require("express");
const router = express.Router();
const multer = require("multer");
const invoiceDocumentController = require("../controllers/invoiceDocumentController");
const invoiceDraftController = require("../controllers/invoiceDraftController");
const { MAX_DRAFT_FILE_SIZE_MB } = require("../constants/invoiceDrafts");
const {
  getInvoiceMasterSuggestions,
  createCustomerFromInvoice,
  getContractDestinations,
} = require("../controllers/masterSearchController");
const createModuleRouter = require("./moduleRouteFactory");
const { buildInvoiceFilterWhere } = require("../utils/invoiceFilters");
const { getInvoiceAccessWhere } = require("../utils/invoiceAccess");
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
  User,
} = require("../models");

// 1. Force Memory Storage inside this route
const memoryStorage = multer.memoryStorage();
// Use .any() to seamlessly accept dynamic multi-row file keys (e.g. doc1_0, doc1_1, etc.)
const memoryUpload = multer({ storage: memoryStorage });
const draftUpload = multer({ storage: memoryStorage, limits: { fileSize: MAX_DRAFT_FILE_SIZE_MB * 1024 * 1024 } });

const registry = {
  invoices: {
    model: InvoiceHeader,
    tableName: "InvoiceHeader",
    primaryKey: "InvoiceID",
    searchFields: ["InvoiceNumber", "LRNumber", "SONumber"],
    sortFields: ["InvoiceID", "InvoiceNumber", "InvoiceDate", "VendorID", "PlantID", "UploadedDate"],
    // Structured filters (date range, vendor, plant, status) shared with the
    // Reports export endpoint via buildInvoiceFilterWhere.
    buildExtraWhere: buildInvoiceFilterWhere,
    buildAccessWhere: getInvoiceAccessWhere,
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
  { model: StatusMaster, as: "invoiceStatus" },
  // Who entered the invoice and who it waits for / was approved by.
  { model: User, as: "uploader", attributes: ["UserID", "FullName", "Email"] },
  { model: User, as: "selectedApprover", attributes: ["UserID", "FullName"] },
  { model: User, as: "finalApprover", attributes: ["UserID", "FullName"] }
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
  authMiddleware,
  invoiceDocumentController.sendSelectedInvoicesMail
);

// Specific GET route for suggestions (Will map to GET /api/invoices/invoice-suggestions)
router.get('/invoice-suggestions', getInvoiceMasterSuggestions);

// Destinations of a vendor's active contract of one type, used by the
// destination dropdown of Add / Edit Invoice.
router.get("/contract-destinations", authMiddleware, getContractDestinations);

// Inline add of a new customer / supplier name from Add Invoice.
router.post('/customers', authMiddleware, createCustomerFromInvoice);

// Saved Add / Edit Invoice drafts - each user sees their own and the ones
// shared with them.
router.get("/drafts", authMiddleware, invoiceDraftController.listDrafts);
router.post("/drafts", authMiddleware, draftUpload.any(), invoiceDraftController.saveDraft);
router.get("/drafts/:id", authMiddleware, invoiceDraftController.getDraft);
router.put("/drafts/:id", authMiddleware, draftUpload.any(), invoiceDraftController.saveDraft);
router.delete("/drafts/:id", authMiddleware, invoiceDraftController.deleteDraft);
router.get("/drafts/:id/files/:fileKey", authMiddleware, invoiceDraftController.downloadDraftFile);
router.get("/drafts/:id/share-candidates", authMiddleware, invoiceDraftController.getShareCandidates);
router.post("/drafts/:id/share", authMiddleware, invoiceDraftController.shareDraft);

// Fallback for factory-generated sub-routes
router.use(baseFactoryRouter);

module.exports = router;