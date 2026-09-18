import React from "react";
import {
  Box,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Typography,
} from "@mui/material";
import VendorGSTTable from "./VendorGSTTable";

const VendorForm = ({
  formData,
  handleChange,
  handleSubmit,
  handleCancel,
  gstNumbers,
  setGSTNumbers,
}) => {
  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      {/* Section Subheading */}
      <Typography variant="h6" sx={{ mb: 3 }}>
        Vendor Information
      </Typography>

      {/* Form Input Fields Grid Container using modern size prop */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            required
            label="Vendor Name"
            name="VendorName"
            value={formData.VendorName}
            onChange={handleChange}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            required
            label="PAN Number"
            name="PANNo"
            slotProps={{
              htmlInput: {
                maxLength: 10,
              },
            }}
            value={formData.PANNo}
            onChange={(event) =>
              handleChange({
                target: {
                  name: "PANNo",
                  value: event.target.value.toUpperCase(),
                },
              })
            }
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            label="Contact Person"
            name="ContactPerson"
            value={formData.ContactPerson}
            onChange={handleChange}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            label="Email"
            name="Email"
            type="email"
            value={formData.Email}
            onChange={handleChange}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            label="Mobile Number"
            name="MobileNo"
            value={formData.MobileNo}
            onChange={handleChange}
          />
        </Grid>
         <Grid size={{ xs: 12 , md: 6 }}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.IsActive}
                onChange={(event) =>
                  handleChange({
                    target: {
                      name: "IsActive",
                      value: event.target.checked,
                    },
                  })
                }
              />
            }
            label="Active"
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Address"
            name="Address"
            value={formData.Address}
            onChange={handleChange}
          />
        </Grid>

        

        {/* GST Sub-Table Section */}
        <Grid size={{ xs: 12 }}>
          <VendorGSTTable
            gstNumbers={gstNumbers}
            setGSTNumbers={setGSTNumbers}
          />
        </Grid>
      </Grid>

      {/* Action Form Buttons Footer */}
      <Box
        sx={{
          mt: 4,
          display: "flex",
          justifyContent: "flex-end",
          gap: 2,
        }}
      >
        <Button variant="outlined" onClick={handleCancel}>
          Cancel
        </Button>

        <Button variant="contained" type="submit">
          Save Vendor
        </Button>
      </Box>
    </Box>
  );
};

export default VendorForm;