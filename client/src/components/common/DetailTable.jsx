import React from "react";
import { 
  Paper, 
  Typography, 
  Table, 
  TableHead, 
  TableRow, 
  TableCell, 
  TableBody 
} from "@mui/material";

const DetailTable = ({ title, columns = [], rows = [], renderRow }) => {
  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      {/* Table Section Title */}
      {title && (
        <Typography variant="h6" sx={{ mb: 2 }}>
          {title}
        </Typography>
      )}

      {/* Styled Data Table */}
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((col, index) => (
              <TableCell key={index} width={col.width}>
                {col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows && rows.length > 0 ? (
            rows.map((row, index) => renderRow(row, index))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} align="center">
                No records found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Paper>
  );
};

export default DetailTable;