import React, { useEffect, useMemo, useState } from "react";
import { 
  Box, 
  Grid, 
  IconButton, 
  Button
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Visibility,
  Business,
  CheckCircle,
  Cancel,
  TrendingUp,
  CloudUpload
} from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import axios from "axios";

import { fetchVendors, removeVendor } from "../../redux/slices/vendorSlice";
import useDebounce from "../../hooks/useDebounce";
<<<<<<< HEAD
import usePermissions from "../../hooks/usePermissions";
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c

/* Common Shared UI Components */
import LoadingOverlay from "../../components/common/LoadingOverlay";
import DeleteDialog from "../../components/common/DeleteDialog";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import PageCard from "../../components/common/PageCard";
import SearchPanel from "../../components/common/SearchPanel";
import TableToolbar from "../../components/common/TableToolbar";
import StatusChip from "../../components/common/StatusChip";
import SkeletonTable from "../../components/common/SkeletonTable";
import EmptyState from "../../components/common/EmptyState";
import FilterPanel from "../../components/common/FilterPanel";
import CustomDataGrid from "../../components/common/CustomDataGrid";
import BulkUploadModal from "../../components/common/BulkUploadModal";

const VendorList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { vendors, loading, totalRecords } = useSelector((state) => state.vendor);
  const { token } = useSelector((state) => state.auth);
<<<<<<< HEAD
  const { canEdit, loaded: permissionsLoaded } = usePermissions();
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c

  /* Live Search Configuration States */
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  /* Pagination Controls States */
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  /* Server Side Grid Sorting States */
  const [sortModel, setSortModel] = useState([
    {
      field: "VendorID",
      sort: "desc",
    },
  ]);

  /* Action Delete Dialog Flow States */
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  /* Bulk Upload Popup Modal State */
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProcessing, setUploadProcessing] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);

  /* Advance Layer Filtering Controls States */
  const [showFilters, setShowFilters] = useState(false);

  /* Effect Hook to Load Paginated Vendors from Server API Endpoint */
  useEffect(() => {
    dispatch(
      fetchVendors({
        page: page + 1,
        pageSize,
        search: debouncedSearch,
        sortField: sortModel[0]?.field || "VendorID",
        sortOrder: sortModel[0]?.sort?.toUpperCase() || "DESC",
      })
    );
  }, [dispatch, page, pageSize, debouncedSearch, sortModel]);

  /* Trigger Dialog Window for deleting profile record row item */
  const handleDeleteClick = (id) => {
    setSelectedVendor(id);
    setDeleteDialog(true);
  };

  /* Dispatches Async Action to confirm the delete processing loop */
  const handleDeleteConfirm = async () => {
    try {
      setDeleteLoading(true);
      const result = await dispatch(removeVendor(selectedVendor));

      if (removeVendor.fulfilled.match(result)) {
        dispatch(
          fetchVendors({
            page: page + 1,
            pageSize,
            search: debouncedSearch,
            sortField: sortModel[0]?.field || "VendorID",
            sortOrder: sortModel[0]?.sort?.toUpperCase() || "DESC",
          })
        );
      }
      setDeleteDialog(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  /* Function to Download Excel Template matching Vendor attributes */
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        VendorCode: "VEND001",
        VendorName: "Sample Transport Co.",
        Address: "123 Industrial Area, City",
        ContactPerson: "John Doe",
        Email: "sample@vendor.com",
        MobileNo: "9876543210",
        PANNo: "ABCDE1234F",
        IsActive: 1,
        GSTNumber1: "24AAAAA0000A1Z5",
        GSTNumber2: "27BBBBB1111B2Z6",
        GSTNumber3: "",
        GSTNumber4: ""
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    const objectKeys = Object.keys(templateData[0]);
    const columnWidths = objectKeys.map((key) => {
      const maxLength = Math.max(
        key.length,
        ...templateData.map((row) => (row[key] ? row[key].toString().length : 0))
      );
      return { wch: maxLength + 5 };
    });
    worksheet["!cols"] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "VendorTemplate");

    XLSX.writeFile(workbook, "Vendor_Bulk_Upload_Template.xlsx");
  };

  /* Handle selection of Excel file inside the modal */
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setUploadMessage(null);
  };

  /* Handle Submission of Excel File to Backend API Endpoint */
  const handleBulkUploadSubmit = async () => {
    if (!selectedFile) {
      alert("Please select an Excel file first.");
      return;
    }

    try {
      setUploadProcessing(true);
      setUploadMessage(null);

      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await axios.post("http://localhost:5000/api/vendors/bulk-upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
      });

      if (response.data.success) {
        setUploadMessage({ type: "success", text: response.data.message });
        setTimeout(() => {
          setUploadModalOpen(false);
          setSelectedFile(null);
          setUploadMessage(null);
        }, 1500);

        dispatch(
          fetchVendors({
            page: page + 1,
            pageSize,
            search: debouncedSearch,
            sortField: sortModel[0]?.field || "VendorID",
            sortOrder: sortModel[0]?.sort?.toUpperCase() || "DESC",
          })
        );
      }
    } catch (error) {
      console.error("Bulk upload submission failed:", error);
      setUploadMessage({ 
        type: "error", 
        text: error.response?.data?.message || "Failed to upload vendors spreadsheet." 
      });
    } finally {
      setUploadProcessing(false);
    }
  };

  /* Calculated memoized real-time Dashboard Counters metrics */
  const statistics = useMemo(() => {
    const active = vendors.filter((v) => v.IsActive).length;
    const inactive = vendors.filter((v) => !v.IsActive).length;

    return [
      {
        title: "Total Vendors",
        value: totalRecords,
        subtitle: "Registered Vendors",
        icon: <Business />,
        color: "primary",
      },
      {
        title: "Active Vendors",
        value: active,
        subtitle: "Currently Active",
        icon: <CheckCircle />,
        color: "success",
      },
      {
        title: "Inactive Vendors",
        value: inactive,
        subtitle: "Inactive Vendors",
        icon: <Cancel />,
        color: "error",
      },
      {
        title: "Current Page",
        value: vendors.length,
        subtitle: "Loaded Records",
        icon: <TrendingUp />,
        color: "warning",
      },
    ];
  }, [vendors, totalRecords]);

  /* Column Structural Layout mapping properties schema */
  const columns = [
    {
      field: "VendorCode",
      headerName: "Vendor Code",
      width: 110,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "VendorName",
      headerName: "Vendor Name",
      flex: 1,
      minWidth: 160,
    },
    {
      field: "PANNo",
      headerName: "PAN Number",
      width: 120,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "MobileNo",
      headerName: "Mobile Number",
      width: 120,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "Email",
      headerName: "Email Address",
      flex: 1,
      minWidth: 200,
    },
    {
      field: "IsActive",
      headerName: "Status",
      width: 110,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <StatusChip status={params.value ? "active" : "inactive"} />
      ),
    },
    {
      field: "Action",
      headerName: "Actions",
      width: 140,
      sortable: false,
      filterable: false,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
          <IconButton
            color="primary"
            size="small"
            onClick={() => navigate(`/vendors/view/${params.row.VendorID}`)}
          >
            <Visibility fontSize="small" />
          </IconButton>

          <IconButton
            color="warning"
            size="small"
            onClick={() => navigate(`/vendors/edit/${params.row.VendorID}`)}
<<<<<<< HEAD
            sx={{ display: permissionsLoaded && canEdit("vendors") ? "inline-flex" : "none" }}
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
          >
            <Edit fontSize="small" />
          </IconButton>

          <IconButton
            color="error"
            size="small"
            onClick={() => handleDeleteClick(params.row.VendorID)}
          >
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box 
      className="page-container" 
      sx={{ 
        width: "100%", 
        display: "flex", 
        flexDirection: "column",
        boxSizing: "border-box"
      }}
    >
      {/* Top Banner Navigation Action Header block */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", mb: 3 }}>
        <PageHeader 
          title="Vendor Master"
          subtitle="Manage all vendor records from a single place."
          breadcrumbs={[
<<<<<<< HEAD
            { label: "Dashboard", path: "/dashboard" },
=======
            { label: "Dashboard", path: "/" },
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
            { label: "Master" },
            { label: "Vendor" },
          ]}
          buttonText="Add Vendor"
          buttonIcon={<Add />}
          onButtonClick={() => navigate("/vendors/add")}
        />

        <Button
          variant="contained"
          color="success"
          startIcon={<CloudUpload />}
          onClick={() => setUploadModalOpen(true)}
          sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, px: 2.5 }}
        >
          Bulk Upload
        </Button>
      </Box>

      {/* Statistics Cards Grid View Block */}
      <Grid 
        container 
        spacing={3} 
        sx={{ 
          mb: 3, 
          width: "100% !important", 
          "& .MuiGrid-item": { display: "flex" }
        }}
      >
        {statistics.map((item) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={item.title} sx={{ pl: "0px !important", pr: 2, pb: 1 }}>
            <StatCard
              title={item.title}
              value={item.value}
              subtitle={item.subtitle}
              icon={item.icon}
              color={item.color}
            />
          </Grid>
        ))}
      </Grid>

      {/* Global Search and Query operations filter controller panel */}
      <SearchPanel
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search Vendor Name, Vendor Code, PAN, Mobile or Email..."
        onRefresh={() =>
          dispatch(
            fetchVendors({
              page: page + 1,
              pageSize,
              search: debouncedSearch,
              sortField: sortModel[0]?.field || "VendorID",
              sortOrder: sortModel[0]?.sort?.toUpperCase() || "DESC",
            })
          )
        }
        onFilter={() => setShowFilters((prev) => !prev)}
      />

      {/* Filters context expansion container wrapper panel node */}
      <FilterPanel open={showFilters} onApply={() => {}} onReset={() => {}}>
        {/* Future Filters layout settings inside here */}
      </FilterPanel>

<<<<<<< HEAD
=======
      {/* Table grid listing operations toolbar module context row */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2, mb: 1 }}>
        <TableToolbar
          title="Vendor List"
          totalRecords={totalRecords}
          onRefresh={() =>
            dispatch(
              fetchVendors({
                page: page + 1,
                pageSize,
                search: debouncedSearch,
                sortField: sortModel[0]?.field || "VendorID",
                sortOrder: sortModel[0]?.sort?.toUpperCase() || "DESC",
              })
            )
          }
        />
      </Box>

>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
      {/* Master Content Data Table Display Card component using CustomDataGrid */}
      <PageCard
        sx={{
          width: "100%",
          borderRadius: 4,
          overflow: "hidden",
          p: 0,
        }}
      >
        {loading ? (
          <SkeletonTable rows={10} columns={7} />
        ) : vendors.length === 0 ? (
          <EmptyState
            title="No Vendors Found"
            description="There are no vendors available. Start by adding your first vendor."
            buttonText="Add Vendor"
            buttonIcon={<Add />}
            onButtonClick={() => navigate("/vendors/add")}
          />
        ) : (
          <CustomDataGrid
            rows={vendors}
            columns={columns}
            getRowId={(row) => row.VendorID}
            loading={loading}
            totalRecords={totalRecords}
            page={page}
            pageSize={pageSize}
            onPaginationModelChange={(model) => {
              queueMicrotask(() => {
                setPage(model.page);
                setPageSize(model.pageSize);
              });
            }}
            sortModel={sortModel}
            onSortModelChange={(model) => {
              queueMicrotask(() => {
                setSortModel(model);
              });
            }}
          />
        )}
      </PageCard>

      {/* Bulk Upload Modal Component using BulkUploadModal */}
      <BulkUploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Bulk Vendor Upload via Excel"
        description="Download the standard template containing fields for Vendor attributes and up to 4 GST numbers, fill in your records, and upload the completed spreadsheet below."
        onDownloadTemplate={handleDownloadTemplate}
        selectedFile={selectedFile}
        onFileSelect={handleFileSelect}
        uploadMessage={uploadMessage}
        uploadProcessing={uploadProcessing}
        onSubmit={handleBulkUploadSubmit}
      />

      {/* Item Delete Record action verification popup prompt window dialog */}
      <DeleteDialog
        open={deleteDialog}
        loading={deleteLoading}
        title="Delete Vendor"
        message="Are you sure you want to delete this vendor?"
        onClose={() => setDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
      />

      {/* Global blocking transparent loader dashboard spinner overlay */}
      <LoadingOverlay open={loading} message="Loading Vendors..." />
    </Box>
  );
};

export default VendorList;