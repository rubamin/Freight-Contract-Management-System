const express = require("express");
const router = express.Router();
const multer = require("multer");
const invoiceDocumentController = require("../controllers/invoiceDocumentController");
const { getInvoiceMasterSuggestions } = require("../controllers/masterSearchController");
const createModuleRouter = require("./moduleRouteFactory");

const {
  InvoiceHeader,
  InvoiceItem,
  InvoiceVerification,
  Vendor,
  VendorGST,
  Plant,

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
    searchFields: ["InvoiceNumber", "LRNumber", "VehicleNumber"],
    sortFields: ["InvoiceID", "InvoiceNumber", "InvoiceDate", "VendorID", "PlantID", "UploadedDate"],

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
router.post(
  "/documents/upload",

  memoryUpload.any(), 
  invoiceDocumentController.uploadDocument
);

// Specific GET route for suggestions (Will map to GET /api/invoices/invoice-suggestions)
router.get('/invoice-suggestions', getInvoiceMasterSuggestions);


// Fallback for factory-generated sub-routes
router.use(baseFactoryRouter);

module.exports = router;