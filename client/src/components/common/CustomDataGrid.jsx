import React from "react";
import { DataGrid } from "@mui/x-data-grid";

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
  return (
    <DataGrid
      rows={rows}
      columns={columns}
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
          overflowX: "hidden",
        },
        ...sx,
      }}
    />
  );
};

export default CustomDataGrid;