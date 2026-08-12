import React from "react";
import {
  Box,
  Button,
  IconButton,
  Paper,
  Radio,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";

const VendorGSTTable = ({ gstNumbers, setGSTNumbers }) => {
  // Add a new blank GST record row
  const handleAddRow = () => {
    setGSTNumbers([
      ...gstNumbers,
      {
        GSTNumber: "",
        StateName: "",
        IsDefault: false,
      },
    ]);
  };

  // Handle value modifications for specific row elements
  const handleChange = (index, field, value) => {
    const updatedGSTNumbers = [...gstNumbers];
    updatedGSTNumbers[index][field] = value;
    setGSTNumbers(updatedGSTNumbers);
  };

  // Set the default active GST item identifier
  const handleDefault = (index) => {
    const updatedGSTNumbers = gstNumbers.map((item, currentIndex) => ({
      ...item,
      IsDefault: currentIndex === index,
    }));

    setGSTNumbers(updatedGSTNumbers);
  };

  // Remove a specific GST record row
  const handleDelete = (index) => {
    const updatedGSTNumbers = [...gstNumbers];
    updatedGSTNumbers.splice(index, 1);
    setGSTNumbers(updatedGSTNumbers);
  };

  return (
    <Paper sx={{ mt: 4, p: 2 }}>
      {/* Table Header Section */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">GST Details</Typography>

        <Button variant="contained" startIcon={<Add />} onClick={handleAddRow}>
          Add GST
        </Button>
      </Box>

      {/* GST Records Dynamic Table */}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell width={60}>Default</TableCell>
            <TableCell>GST Number</TableCell>
            <TableCell>State</TableCell>
            <TableCell width={80}>Action</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {gstNumbers.map((gst, index) => (
            <TableRow key={index}>
              <TableCell>
                <Radio
                  checked={gst.IsDefault}
                  onChange={() => handleDefault(index)}
                  aria-label={`set row ${index + 1} as default gst`}
                />
              </TableCell>

              <TableCell>
                <TextField
                  fullWidth
                  size="small"
                  value={gst.GSTNumber}
                  slotProps={{
                    htmlInput: {
                      maxLength: 15,
                    },
                  }}
                  onChange={(event) =>
                    handleChange(
                      index,
                      "GSTNumber",
                      event.target.value.toUpperCase()
                    )
                  }
                />
              </TableCell>

              <TableCell>
                <TextField
                  fullWidth
                  size="small"
                  value={gst.StateName}
                  onChange={(event) =>
                    handleChange(index, "StateName", event.target.value)
                  }
                />
              </TableCell>

              <TableCell>
                <IconButton
                  color="error"
                  onClick={() => handleDelete(index)}
                  disabled={gstNumbers.length === 1}
                  aria-label="delete gst row"
                >
                  <Delete />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
};

export default VendorGSTTable;