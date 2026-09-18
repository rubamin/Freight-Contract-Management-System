import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Chip,
  IconButton,
  Paper,
  TextField,
  InputAdornment,
<<<<<<< HEAD
  Button,
} from "@mui/material";
import { Delete, Edit, Search, ToggleOff, CloudUpload } from "@mui/icons-material";
=======
} from "@mui/material";
import { Delete, Search } from "@mui/icons-material";
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
import { DataGrid } from "@mui/x-data-grid";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import DeleteDialog from "../../components/common/DeleteDialog";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import AppSnackbar from "../../components/common/AppSnackbar";
<<<<<<< HEAD
import BulkUploadModal from "../../components/common/BulkUploadModal";
import useDebounce from "../../hooks/useDebounce";
import usePermissions from "../../hooks/usePermissions";
import { moduleConfigs } from "../../constants/moduleConfigs";
import * as moduleService from "../../services/moduleService";
=======
import useDebounce from "../../hooks/useDebounce";
import { moduleConfigs } from "../../constants/moduleConfigs";
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
import {
  fetchModuleRecords,
  removeModuleRecord,
} from "../../redux/slices/moduleSlice";

const ModuleList = ({ configKey }) => {
  const config = moduleConfigs[configKey];
<<<<<<< HEAD
  const { canEdit, loaded: permissionsLoaded } = usePermissions();
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { recordsByModule, totalRecordsByModule, loading, error } =
    useSelector((state) => state.module);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
<<<<<<< HEAD
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [bulkUploadFile, setBulkUploadFile] = useState(null);
  const [bulkUploadMessage, setBulkUploadMessage] = useState(null);
  const [bulkUploadProcessing, setBulkUploadProcessing] = useState(false);
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c

  const debouncedSearch = useDebounce(search, 500);
  const stateKey = config.stateKey || config.moduleName;
  const rows = recordsByModule[stateKey] || [];
  const totalRecords = totalRecordsByModule[stateKey] || 0;

  const loadRecords = () => {
    dispatch(
      fetchModuleRecords({
        config,
        params: {
          page: page + 1,
          pageSize,
          search: debouncedSearch,
        },
      })
    );
  };

  useEffect(() => {
    loadRecords();
  }, [configKey, page, pageSize, debouncedSearch]);

  const columns = useMemo(() => {
    const dataColumns = config.columns.map((field) => ({
      field,
      headerName: field,
      flex: 1,
      minWidth: 140,
      renderCell: (params) => {
        if (typeof params.value === "boolean") {
          return (
            <Chip
              label={params.value ? "Active" : "Inactive"}
              color={params.value ? "success" : "error"}
              size="small"
            />
          );
        }

        return params.value ?? "-";
      },
    }));

<<<<<<< HEAD
    // Table column order standard (task item 8): Sr. No. first, data
    // columns in the middle, Action always last. Sr. No. is a simple
    // page-relative row index (page * pageSize + row position), not the
    // record's DB primary key, since that's what "Sr. No." conventionally
    // means in this app's master lists.
    const srNoColumn = {
      field: "srNo",
      headerName: "Sr. No.",
      width: 90,
      sortable: false,
      renderCell: (params) => {
        const rowIndex = rows.findIndex((r) => r[config.idField] === params.row[config.idField]);
        return page * pageSize + rowIndex + 1;
      },
    };

    const actionColumn = {
      field: "Action",
      headerName: "Action",
      width: 110,
      sortable: false,
      renderCell: (params) => (
        <>
          {/* Bug fix (task item 17): Edit is hidden, not just
              backend-blocked, when the user lacks Edit permission for
              this module. Withheld entirely (not shown-then-disabled)
              until permissions have loaded, to avoid a flash of the
              button before it's hidden. */}
          {config.editPath && permissionsLoaded && canEdit(config.moduleName) && (
            <IconButton
              color="primary"
              onClick={() => navigate(`${config.editPath}/${params.row[config.idField]}`)}
            >
              <Edit fontSize="small" />
            </IconButton>
          )}
          <IconButton
            color="error"
            // Masters with softDeleteOnly show a deactivate icon instead of
            // a trash icon, since the action flips IsActive rather than
            // permanently removing the record (task item 4/7).
=======
    return [
      {
        field: "Action",
        headerName: "Action",
        width: 90,
        sortable: false,
        renderCell: (params) => (
          <IconButton
            color="error"
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
            onClick={() => {
              setSelectedRecordId(params.row[config.idField]);
              setDeleteDialog(true);
            }}
          >
<<<<<<< HEAD
            {config.softDeleteOnly ? <ToggleOff fontSize="small" /> : <Delete fontSize="small" />}
          </IconButton>
        </>
      ),
    };

    return [srNoColumn, ...dataColumns, actionColumn];
  }, [config, navigate, rows, page, pageSize, permissionsLoaded, canEdit]);
=======
            <Delete />
          </IconButton>
        ),
      },
      ...dataColumns,
    ];
  }, [config]);
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c

  const handleDeleteConfirm = async () => {
    const result = await dispatch(
      removeModuleRecord({
        config,
        id: selectedRecordId,
      })
    );

    if (removeModuleRecord.fulfilled.match(result)) {
      setDeleteDialog(false);
      loadRecords();
    }
  };

<<<<<<< HEAD
  // Bulk Excel upload (task item 11) - only shown for modules whose config
  // opts in via bulkUploadFields (never Contract Master or Invoices).
  const handleDownloadTemplate = () => {
    const headerRow = config.bulkUploadFields.join(",");
    const blob = new Blob([`${headerRow}\n`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${config.moduleName}-template.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkFileSelect = (e) => {
    setBulkUploadFile(e.target.files[0] || null);
    setBulkUploadMessage(null);
  };

  const handleBulkUploadSubmit = async () => {
    if (!bulkUploadFile) return;

    setBulkUploadProcessing(true);
    try {
      const response = await moduleService.bulkUploadRecords({
        apiGroup: config.apiGroup,
        moduleName: config.moduleName,
        file: bulkUploadFile,
      });
      setBulkUploadMessage({ type: "success", text: response.data.message });
      loadRecords();
    } catch (err) {
      setBulkUploadMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to process the uploaded file.",
      });
    } finally {
      setBulkUploadProcessing(false);
    }
  };

=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
  return (
    <Box p={3}>
      <PageHeader
        title={config.title}
        breadcrumbs={[
          {
            label: "Dashboard",
<<<<<<< HEAD
            path: "/dashboard",
=======
            path: "/vendors",
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
          },
          {
            label: config.title,
          },
        ]}
        buttonText={config.addButtonText}
        onButtonClick={
          config.addPath ? () => navigate(config.addPath) : undefined
        }
      />

<<<<<<< HEAD
      <Paper sx={{ p: 2, mb: 2, display: "flex", gap: 2, alignItems: "center" }}>
=======
      <Paper sx={{ p: 2, mb: 2 }}>
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
        <TextField
          fullWidth
          size="small"
          placeholder={`Search ${config.title}`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
<<<<<<< HEAD
        {config.bulkUploadFields && (
          <Button
            variant="outlined"
            startIcon={<CloudUpload />}
            sx={{ whiteSpace: "nowrap" }}
            onClick={() => setBulkUploadOpen(true)}
          >
            Bulk Upload
          </Button>
        )}
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
      </Paper>

      <Paper>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(row) => row[config.idField]}
          loading={loading}
          autoHeight
          disableRowSelectionOnClick
          paginationMode="server"
          rowCount={totalRecords}
          pageSizeOptions={[10, 20, 50, 100]}
          paginationModel={{
            page,
            pageSize,
          }}
          onPaginationModelChange={(model) => {
            setPage(model.page);
            setPageSize(model.pageSize);
          }}
        />
      </Paper>

      <DeleteDialog
        open={deleteDialog}
<<<<<<< HEAD
        title={config.softDeleteOnly ? `Deactivate ${config.title}` : `Delete ${config.title}`}
        message={
          config.softDeleteOnly
            ? "Are you sure you want to deactivate this record? It will no longer appear as an option elsewhere, but historical records that reference it are unaffected."
            : "Are you sure you want to delete this record?"
        }
=======
        title={`Delete ${config.title}`}
        message="Are you sure you want to delete this record?"
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
        onClose={() => setDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
      />

      <LoadingOverlay open={loading} message={`Loading ${config.title}...`} />

      <AppSnackbar
        open={Boolean(error)}
        severity="error"
        message={error}
        onClose={() => {}}
      />
<<<<<<< HEAD

      {config.bulkUploadFields && (
        <BulkUploadModal
          open={bulkUploadOpen}
          onClose={() => {
            setBulkUploadOpen(false);
            setBulkUploadFile(null);
            setBulkUploadMessage(null);
          }}
          title={`Bulk Upload ${config.title}`}
          onDownloadTemplate={handleDownloadTemplate}
          selectedFile={bulkUploadFile}
          onFileSelect={handleBulkFileSelect}
          uploadMessage={bulkUploadMessage}
          uploadProcessing={bulkUploadProcessing}
          onSubmit={handleBulkUploadSubmit}
        />
      )}
=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
    </Box>
  );
};

export default ModuleList;
