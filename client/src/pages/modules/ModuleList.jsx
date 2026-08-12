import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Chip,
  IconButton,
  Paper,
  TextField,
  InputAdornment,
} from "@mui/material";
import { Delete, Search } from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import DeleteDialog from "../../components/common/DeleteDialog";
import LoadingOverlay from "../../components/common/LoadingOverlay";
import AppSnackbar from "../../components/common/AppSnackbar";
import useDebounce from "../../hooks/useDebounce";
import { moduleConfigs } from "../../constants/moduleConfigs";
import {
  fetchModuleRecords,
  removeModuleRecord,
} from "../../redux/slices/moduleSlice";

const ModuleList = ({ configKey }) => {
  const config = moduleConfigs[configKey];
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { recordsByModule, totalRecordsByModule, loading, error } =
    useSelector((state) => state.module);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);

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

    return [
      {
        field: "Action",
        headerName: "Action",
        width: 90,
        sortable: false,
        renderCell: (params) => (
          <IconButton
            color="error"
            onClick={() => {
              setSelectedRecordId(params.row[config.idField]);
              setDeleteDialog(true);
            }}
          >
            <Delete />
          </IconButton>
        ),
      },
      ...dataColumns,
    ];
  }, [config]);

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

  return (
    <Box p={3}>
      <PageHeader
        title={config.title}
        breadcrumbs={[
          {
            label: "Dashboard",
            path: "/vendors",
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

      <Paper sx={{ p: 2, mb: 2 }}>
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
        title={`Delete ${config.title}`}
        message="Are you sure you want to delete this record?"
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
    </Box>
  );
};

export default ModuleList;
