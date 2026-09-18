import React, { useState } from "react";
import { Box, Paper } from "@mui/material";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Add } from "@mui/icons-material";

import PageHeader from "../../components/common/PageHeader";
import AppSnackbar from "../../components/common/AppSnackbar";
import VendorForm from "../../components/vendor/VendorForm";
import LoadingOverlay from "../../components/common/LoadingOverlay";

import { addVendor } from "../../redux/slices/vendorSlice";

// GST State Code mapping definitions matching legal regulations
const GST_STATE_MAP = {
  "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
  "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
  "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
  "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu", "27": "Maharashtra", "29": "Karnataka",
  "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry",
  "35": "Andaman and Nicobar Islands", "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh"
};

const AddVendor = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [snackbar, setSnackbar] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  const [formData, setFormData] = useState({
    VendorName: "",
    Address: "",
    ContactPerson: "",
    Email: "",
    MobileNo: "",
    PANNo: "",
    IsActive: true,
  });

  const [gstNumbers, setGSTNumbers] = useState([
    {
      GSTNumber: "",
      StateName: "",
      IsDefault: true,
    },
  ]);

  // Handle core vendor textual element changes cleanly
  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedValue = name === "PANNo" ? value.toUpperCase() : value;

    setFormData((prev) => {
      const updatedState = { ...prev, [name]: updatedValue };
      
      // Auto fill ContactPerson only if it is completely blank or matches the previous text loop sequence
      if (name === "VendorName") {
        if (!prev.ContactPerson || prev.ContactPerson === prev.VendorName) {
          updatedState.ContactPerson = value;
        }
      }
      return updatedState;
    });
  };

  // Automated custom updater logic to handle the state name and PAN generation triggers
  const handleGstNumbersChange = (updatedGstNumbers) => {
    const customizedRows = updatedGstNumbers.map((row) => {
      let currentGst = row.GSTNumber ? row.GSTNumber.toUpperCase() : "";
      let resolvedState = row.StateName;

      if (currentGst.length >= 2) {
        const stateCode = currentGst.substring(0, 2);
        if (GST_STATE_MAP[stateCode]) {
          resolvedState = GST_STATE_MAP[stateCode];
          
          // Auto-inject the Master PAN configuration right behind the state code digits
          if (formData.PANNo && currentGst.length === 2) {
            currentGst = stateCode + formData.PANNo;
          }
        }
      } else if (currentGst.length < 2) {
        resolvedState = "";
      }

      return {
        ...row,
        GSTNumber: currentGst,
        StateName: resolvedState
      };
    });

    setGSTNumbers(customizedRows);
  };

  const handleCancel = () => {
    navigate("/vendors");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Send both naming structures to completely satisfy backend requirements safely
      const payload = {
        ...formData,
        gstNumbers: gstNumbers,
        gstDetails: gstNumbers
      };

      const result = await dispatch(addVendor(payload));

      if (addVendor.fulfilled.match(result)) {
        setSnackbar({
          open: true,
          severity: "success",
          message: "Vendor Created Successfully",
        });

        setTimeout(() => {
          navigate("/vendors");
        }, 1000);
      } else {
        throw new Error(result.payload || "Failed to process data save action.");
      }
    } catch (error) {
      setSnackbar({
        open: true,
        severity: "error",
        message: error.message || "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={3}>
      <Paper sx={{ p: 3 }}>
        <PageHeader
          title="Add Vendor"
          breadcrumbs={[
            { label: "Dashboard", path: "/dashboard" },
            { label: "Vendor", path: "/vendors" },
            { label: "Add" },
          ]}
        />

        <VendorForm
          formData={formData}
          handleChange={handleChange}
          handleSubmit={handleSubmit}
          handleCancel={handleCancel}
          gstNumbers={gstNumbers}
          setGSTNumbers={handleGstNumbersChange}
          loading={loading}
          errors={errors}
        />
      </Paper>

      <AppSnackbar
        open={snackbar.open}
        severity={snackbar.severity}
        message={snackbar.message}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      />

      <LoadingOverlay open={loading} message="Saving Vendor..." />
    </Box>
  );
};

export default AddVendor;