const multer = require("multer");
const contractService = require("../services/contract.service");
const ApiResponse = require("../utils/ApiResponse");

// Multer memory storage configuration - to accept a single excel sheet upload only
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // Maximum file size limit: 20 MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file format. Only Excel files (.xls, .xlsx) are allowed."), false);
    }
  },
});

// Global error handler helper function - updated to extract structured validation messages
const sendError = ({ res, error, statusCode = 400 }) => {
  return ApiResponse.error({
    res,
    statusCode: error.statusCode || statusCode,
    message: error.message,
    errors: error.errors || [error.message], // Passes the validation string arrays directly
  });
};

// Multer upload middleware wrapper
const handleUpload = (uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware(req, res, (error) => {
      if (!error) {
        return next();
      }

      if (error instanceof multer.MulterError) {
        const message =
          error.code === "LIMIT_FILE_SIZE"
            ? "File size must not exceed 20 MB."
            : error.message;

        return ApiResponse.error({
          res,
          statusCode: 400,
          message,
          errors: [message],
        });
      }

      return ApiResponse.error({
        res,
        statusCode: 400,
        message: error.message,
        errors: [error.message],
      });
    });
  };
};

// 1. Create New Contract
const createContract = async (req, res) => {
  try {
    const contract = await contractService.createContract({
      data: req.body,          
      file: req.file,          
      user: req.user,          
    });

    return ApiResponse.success({
      res,
      statusCode: 201,
      message: "Contract and rate matrix processed successfully.",
      data: contract,
    });
  } catch (error) {
    return sendError({ res, error });
  }
};

// 2. Update Existing Contract
const updateContract = async (req, res) => {
  try {
    const contract = await contractService.updateContract({
      contractId: req.params.id,
      data: req.body,
      file: req.file,          
      user: req.user,
    });

    if (!contract) {
      return ApiResponse.error({
        res,
        statusCode: 404,
        message: "Contract not found.",
      });
    }

    return ApiResponse.success({
      res,
      message: "Contract and rate matrix updated successfully.",
      data: contract,
    });
  } catch (error) {
    return sendError({ res, error });
  }
};

// 3. Delete Contract
const deleteContract = async (req, res) => {
  try {
    const contract = await contractService.deleteContract(req.params.id);

    if (!contract) {
      return ApiResponse.error({
        res,
        statusCode: 404,
        message: "Contract not found.",
      });
    }

    return ApiResponse.success({
      res,
      message: "Contract deleted successfully.",
    });
  } catch (error) {
    return sendError({ res, error, statusCode: 500 });
  }
};

// 4. Get Single Contract Details By ID
const getContract = async (req, res) => {
  try {
    const contract = await contractService.getContractById(req.params.id);

    if (!contract) {
      return ApiResponse.error({
        res,
        statusCode: 404,
        message: "Contract not found.",
      });
    }

    return ApiResponse.success({
      res,
      message: "Contract fetched successfully.",
      data: contract,
    });
  } catch (error) {
    return sendError({ res, error, statusCode: 500 });
  }
};

// 5. List All Contracts with Pagination
const listContracts = async (req, res) => {
  try {
    const result = await contractService.getAllContracts(req.query);

    return ApiResponse.success({
      res,
      message: "Contracts fetched successfully.",
      data: result.data,
      meta: {
        totalRecords: result.totalRecords,
        page: result.page,
        pageSize: result.pageSize,
      },
    });
  } catch (error) {
    return sendError({ res, error, statusCode: 500 });
  }
};

const getRateMatrix = async (req, res) => {
  try {
    const { id } = req.params;
    const rateMatrix = await contractService.getRateMatrixByContractId(id);

    if (!rateMatrix) {
      return res.status(404).json({ message: "Rate Matrix data entries not found." });
    }

    return res.status(200).json(rateMatrix);
  } catch (error) {
    console.error("Error inside getRateMatrix controller logic:", error);
    return res.status(500).json({ message: "Internal server error while fetching matrix data." });
  }
};

const bulkUpdateRateMatrix = async (req, res) => {
  try {
    const { rates } = req.body;

    if (!rates || !Array.isArray(rates)) {
      return res.status(400).json({ message: "Invalid rates payload structure provided." });
    }

    await contractService.bulkUpdateRateMatrix(rates);

    return res.status(200).json({
      message: "Contract rate matrix bulk changes updated successfully.",
    });
  } catch (error) {
    console.error("Error inside bulkUpdateRateMatrix controller engine:", error);
    return res.status(500).json({ 
      message: "Internal server error occurred while updating bulk matrix variations." 
    });
  }
};

module.exports = {
  uploadExcel: handleUpload(upload.single("rateMatrix")), 
  createContract,
  updateContract,
  deleteContract,
  getContract,
  listContracts,
  getRateMatrix,
  bulkUpdateRateMatrix,
};