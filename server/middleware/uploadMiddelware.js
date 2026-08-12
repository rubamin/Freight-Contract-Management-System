const path = require("path");
const multer = require("multer");

const CONTRACT_FILE_SIZE_LIMIT = 20 * 1024 * 1024;
const CONTRACT_FILE_FIELDS = [
  { name: "contractPdf", maxCount: 1 },
  { name: "pdf", maxCount: 1 },
  { name: "rateMatrix", maxCount: 1 },
  { name: "excel", maxCount: 1 },
];
const CONTRACT_ALLOWED_EXTENSIONS = [".pdf", ".xlsx", ".xls"];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const contractFileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();

  if (!CONTRACT_ALLOWED_EXTENSIONS.includes(extension)) {
    return cb(new Error("Only PDF, XLSX and XLS files are allowed."));
  }

  return cb(null, true);
};

upload.contractFiles = multer({
  storage,
  fileFilter: contractFileFilter,
  limits: {
    fileSize: CONTRACT_FILE_SIZE_LIMIT,
  },
}).fields(CONTRACT_FILE_FIELDS);

/* ========================================================
   New Addition: Vendor Bulk Excel Upload Middleware Configuration
   ======================================================== */
const VENDOR_EXCEL_ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"];
const VENDOR_EXCEL_FILE_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB limit

const vendorExcelFileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();

  if (!VENDOR_EXCEL_ALLOWED_EXTENSIONS.includes(extension)) {
    return cb(new Error("Only Excel (.xlsx, .xls) and CSV files are allowed for vendor bulk upload."));
  }

  return cb(null, true);
};

// Middleware handler for single field name 'file' or 'excel' used during bulk vendor uploads
upload.vendorExcel = multer({
  storage,
  fileFilter: vendorExcelFileFilter,
  limits: {
    fileSize: VENDOR_EXCEL_FILE_SIZE_LIMIT,
  },
}).single("file"); // Expects single file upload payload under form-data key "file"

module.exports = upload;