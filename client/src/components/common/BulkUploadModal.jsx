import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Typography,
  Divider,
  Alert,
} from "@mui/material";
import { CloudUpload, Download } from "@mui/icons-material";

const BulkUploadModal = ({
  open,
  onClose,
  title = "Bulk Upload via Excel",
  description = "Download the standard template, fill in your records, and upload the completed spreadsheet below.",
  onDownloadTemplate,
  selectedFile,
  onFileSelect,
  uploadMessage,
  uploadProcessing,
  onSubmit,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{title}</DialogTitle>
      <Divider />
      <DialogContent sx={{ py: 3 }}>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          {description}
        </Typography>

        {/* Template Download Button */}
        {onDownloadTemplate && (
          <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 3 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Download />}
              onClick={onDownloadTemplate}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              Download Excel Template
            </Button>
          </Box>
        )}

        {/* File Dropzone Box */}
        <Box
          sx={{
            border: "2px dashed #CBD5E1",
            borderRadius: 3,
            p: 3,
            textAlign: "center",
            background: "#F8FAFC",
          }}
        >
          <input
            type="file"
            id="excel-file-input"
            onChange={onFileSelect}
            accept=".xlsx, .xls, .csv"
            style={{ display: "none" }}
          />
          <label htmlFor="excel-file-input" style={{ cursor: "pointer" }}>
            <CloudUpload color="primary" sx={{ fontSize: 48, mb: 1 }} />
            <Typography variant="subtitle1" fontWeight={600} color="textPrimary">
              {selectedFile ? selectedFile.name : "Click to select or drag Excel file here"}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Supports .xlsx, .xls and .csv file formats
            </Typography>
          </label>
        </Box>

        {/* Alert Feedback Message */}
        {uploadMessage && (
          <Alert severity={uploadMessage.type} sx={{ mt: 2 }}>
            {uploadMessage.text}
          </Alert>
        )}
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit" sx={{ textTransform: "none", fontWeight: 600 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={onSubmit}
          disabled={!selectedFile || uploadProcessing}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          {uploadProcessing ? "Uploading..." : "Upload & Save Records"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkUploadModal;