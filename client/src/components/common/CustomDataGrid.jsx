<<<<<<< HEAD
import React, { useMemo } from "react";
import { DataGrid } from "@mui/x-data-grid";

// Table column order standard (task item 8): every list table in the app
// enforces Sr. No. first, data columns in the middle, Action always last.
// Centralizing it here means pages using CustomDataGrid (Vendor, Contract,
// etc.) get it automatically instead of each page repeating the same
// column-reordering logic.
const buildSrNoColumn = ({ rows, page, pageSize }) => ({
  field: "srNo",
  headerName: "Sr. No.",
  width: 90,
  sortable: false,
  filterable: false,
  renderCell: (params) => {
    const rowIndex = rows.findIndex((row) => row === params.row);
    return page * pageSize + rowIndex + 1;
  },
});

=======
import React from "react";
import { DataGrid } from "@mui/x-data-grid";

>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
const CustomDataGrid = ({
  rows,
  columns,
  getRowId,
  loading,
  totalRecords,
  page,
  pageSize,
  onPaginationModelChange,
  sortModel,
  onSortModelChange,
  sx = {},
}) => {
<<<<<<< HEAD
  const orderedColumns = useMemo(() => {
    const dataColumns = columns.filter((col) => col.field !== "Action");
    const actionColumn = columns.find((col) => col.field === "Action");

    return [
      buildSrNoColumn({ rows, page, pageSize }),
      ...dataColumns,
      ...(actionColumn ? [actionColumn] : []),
    ];
  }, [columns, rows, page, pageSize]);

  return (
    <DataGrid
      rows={rows}
      columns={orderedColumns}
=======
  return (
    <DataGrid
      rows={rows}
      columns={columns}
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
      getRowId={getRowId}
      autoHeight
      loading={loading}
      disableRowSelectionOnClick
      paginationMode="server"
      sortingMode="server"
      rowCount={totalRecords}
      pageSizeOptions={[10, 20, 50, 100]}
      paginationModel={{ page, pageSize }}
      onPaginationModelChange={onPaginationModelChange}
      sortModel={sortModel}
      onSortModelChange={onSortModelChange}
      sx={{
        border: 0,
        width: "100%",
        background: "#fff",
        "& .MuiDataGrid-columnHeaders": {
          background: "#F8FAFC",
          fontWeight: 700,
          borderBottom: "1px solid #E5E7EB",
        },
        "& .MuiDataGrid-columnHeaderTitle": {
          fontWeight: 700,
          fontSize: "15px",
        },
        "& .MuiDataGrid-row": {
          minHeight: "58px !important",
        },
        "& .MuiDataGrid-cell": {
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid #F1F5F9",
        },
        "& .MuiDataGrid-footerContainer": {
          borderTop: "1px solid #E5E7EB",
        },
        "& .MuiDataGrid-virtualScroller": {
<<<<<<< HEAD
          overflowX: "auto",
=======
          overflowX: "hidden",
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
        },
        ...sx,
      }}
    />
  );
};

export default CustomDataGrid;