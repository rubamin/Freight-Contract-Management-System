import React, { useEffect, useState } from "react";
import { Box, Paper } from "@mui/material";
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import PageHeader from "../../components/common/PageHeader";
import AppSnackbar from "../../components/common/AppSnackbar";
import VendorForm from "../../components/vendor/VendorForm";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import {
  fetchVendorById,
  editVendor,
} from "../../redux/slices/vendorSlice";

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

const EditVendor = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();

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

  useEffect(() => {
    loadVendor();
  }, []);

  const loadVendor = async () => {
    try {
      const result = await dispatch(fetchVendorById(id));

      if (fetchVendorById.fulfilled.match(result)) {
        const vendor = result.payload.data;

        setFormData({
          VendorName: vendor.VendorName || "",
          Address: vendor.Address || "",
          ContactPerson: vendor.ContactPerson || "",
          Email: vendor.Email || "",
          MobileNo: vendor.MobileNo || "",
          PANNo: vendor.PANNo || "",
          IsActive: vendor.IsActive,
        });

        // Map existing GST numbers properly to match object format expected by table/form
        if (vendor.gstNumbers && vendor.gstNumbers.length > 0) {
          const formattedGst = vendor.gstNumbers.map((item) => ({
            GSTNumber: item.GSTNumber || item || "",
            StateName: item.StateName || "",
            IsDefault: item.IsDefault || false,
          }));
          setGSTNumbers(formattedGst);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Handle core vendor textual element changes cleanly
  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedValue = name === "PANNo" ? value.toUpperCase() : value;

    setFormData((prev) => ({
      ...prev,
      [name]: updatedValue,
    }));
  };

  // Automated custom updater logic matching AddVendor functionality
  const handleGstNumbersChange = (updatedGstNumbers) => {
    const customizedRows = updatedGstNumbers.map((row) => {
      let currentGst = row.GSTNumber ? row.GSTNumber.toUpperCase() : "";
      let resolvedState = row.StateName;

      if (currentGst.length >= 2) {
        const stateCode = currentGst.substring(0, 2);
        if (GST_STATE_MAP[stateCode]) {
          resolvedState = GST_STATE_MAP[stateCode];
          
          // Auto-inject the Master PAN configuration right behind the state code digits if available
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
      const payload = {
        ...formData,
        gstNumbers: gstNumbers,
        gstDetails: gstNumbers, // Sending both to match backend requirements safely like AddVendor
      };

      const result = await dispatch(
        editVendor({
          id,
          vendorData: payload,
        })
      );

      if (editVendor.fulfilled.match(result)) {
        setSnackbar({
          open: true,
          severity: "success",
          message: "Vendor Updated Successfully",
        });

        setTimeout(() => {
          navigate("/vendors");
        }, 1000);
      } else {
        throw new Error(result.payload || "Failed to update vendor data.");
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
          title="Edit Vendor"
          breadcrumbs={[
            { label: "Dashboard", path: "/" },
            { label: "Vendor", path: "/vendors" },
            { label: "Edit" },
          ]}
        />

        <VendorForm
          formData={formData}
          handleChange={handleChange}
          handleSubmit={handleSubmit}
          handleCancel={handleCancel}
          gstNumbers={gstNumbers}
          setGSTNumbers={handleGstNumbersChange} // Passed state updater function correctly
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
      
      <LoadingOverlay open={loading} message="Updating Vendor..." />
    </Box>
  );
};

export default EditVendor;