import React, { useEffect, useState } from "react";
import { 
  Box, 
  Paper, 
  Typography, 
  Grid, 
  Chip, 
  Button,
  TableRow,
  TableCell 
} from "@mui/material";

import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import PageHeader from "../../components/common/PageHeader";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import DetailTextField from "../../components/common/DetailTextField";
import DetailTable from "../../components/common/DetailTable";
import { fetchVendorById } from "../../redux/slices/vendorSlice";

const ViewVendor = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState(null);

  // Load vendor details from server on component mount
  useEffect(() => {
    loadVendor();
  }, [dispatch, id]);

  const loadVendor = async () => {
    try {
      setLoading(true);
      const result = await dispatch(fetchVendorById(id));

      if (fetchVendorById.fulfilled.match(result)) {
        setVendor(result.payload.data);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fallback view while fetching data
  if (!vendor) {
    return (
      <Box p={3}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Vendor Profile Main Details Card */}
      <Paper sx={{ p: 3 }}>
        <PageHeader
          title="Vendor Details"
          breadcrumbs={[
<<<<<<< HEAD
            { label: "Dashboard", path: "/dashboard" },
=======
            { label: "Dashboard", path: "/" },
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
            { label: "Vendor", path: "/vendors" },
            { label: "View" },
          ]}
        />

        {/* Vendor Information Grid using reusable DetailTextField */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <DetailTextField label="Vendor Code" value={vendor.VendorCode} />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <DetailTextField label="Vendor Name" value={vendor.VendorName} />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <DetailTextField label="PAN Number" value={vendor.PANNo} />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <DetailTextField label="Contact Person" value={vendor.ContactPerson} />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <DetailTextField label="Email" value={vendor.Email} />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <DetailTextField label="Mobile" value={vendor.MobileNo} />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <DetailTextField label="Address" value={vendor.Address} multiline rows={3} />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Chip
              label={vendor.IsActive ? "Active" : "Inactive"}
              color={vendor.IsActive ? "success" : "error"}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Associated GST Details Sub-Section using reusable DetailTable */}
      <DetailTable
        title="GST Details"
        columns={[
          { label: "GST Number" },
          { label: "State" },
          { label: "Default" },
        ]}
        rows={vendor.gstNumbers}
        renderRow={(gst) => (
          <TableRow key={gst.VendorGSTID}>
            <TableCell>{gst.GSTNumber}</TableCell>
            <TableCell>{gst.StateName}</TableCell>
            <TableCell>
              <Chip
                label={gst.IsDefault ? "Yes" : "No"}
                color={gst.IsDefault ? "success" : "default"}
                size="small"
              />
            </TableCell>
          </TableRow>
        )}
      />

      {/* Navigation Footer Action */}
      <Box
        sx={{
          mt: 3,
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <Button variant="contained" onClick={() => navigate("/vendors")}>
          Back
        </Button>
      </Box>

      {/* Global Transparent Loader Overlay */}
      <LoadingOverlay open={loading} message="Loading Vendor Details..." />
    </Box>
  );
};

export default ViewVendor;