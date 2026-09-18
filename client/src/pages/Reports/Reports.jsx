import React, { useEffect, useState } from 'react';
import {
    Box,
    Grid,
    TextField,
    Autocomplete,
    MenuItem,
} from '@mui/material';

import PageHeader from '../../components/common/PageHeader';
import FilterPanel from '../../components/common/FilterPanel';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import AppSnackbar from '../../components/common/AppSnackbar';
import * as reportsService from '../../services/reportsService';
import * as moduleService from '../../services/moduleService';
import { getVendors } from '../../redux/api/vendorAPI';
import { triggerBlobDownload } from '../../utils/downloadFile';

const INITIAL_FILTERS = {
    from: '',
    to: '',
    vendorId: '',
    plantId: '',
    statusId: '',
};

export default function Reports() {
    const [filters, setFilters] = useState(INITIAL_FILTERS);
    const [vendors, setVendors] = useState([]);
    const [plants, setPlants] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [isDownloading, setIsDownloading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });

    useEffect(() => {
        const loadMasterData = async () => {
            try {
                const [vendorsRes, plantsRes, statusesRes] = await Promise.all([
                    getVendors({ pageSize: 500 }),
                    moduleService.getRecords({ apiGroup: 'masters', moduleName: 'plants' }),
                    moduleService.getRecords({ apiGroup: 'masters', moduleName: 'statuses' }),
                ]);

                setVendors(vendorsRes.data?.data || []);
                setPlants(plantsRes.data?.data || []);
                setStatuses(statusesRes.data?.data || []);
            } catch (err) {
                console.error('Failed to load report filter options', err);
            }
        };

        loadMasterData();
    }, []);

    const handleFieldChange = (field) => (value) => {
        setFilters((prev) => ({ ...prev, [field]: value }));
    };

    const handleReset = () => {
        setFilters(INITIAL_FILTERS);
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const params = {};
            if (filters.from) params.from = filters.from;
            if (filters.to) params.to = filters.to;
            if (filters.vendorId) params.vendorId = filters.vendorId;
            if (filters.plantId) params.plantId = filters.plantId;
            if (filters.statusId) params.statusId = filters.statusId;

            const response = await reportsService.exportInvoicesExcel(params);
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
            triggerBlobDownload(blob, `invoice-report-${Date.now()}.xlsx`);
        } catch (err) {
            setSnackbar({
                open: true,
                severity: 'error',
                message: 'Failed to generate the report. Please try again.',
            });
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <Box>
            <PageHeader
                title="Reports"
                subtitle="Filter invoices and download the results as an Excel file."
            />

            <FilterPanel
                open
                onApply={handleDownload}
                onReset={handleReset}
                applyText="Download Excel"
                resetText="Clear Filters"
            >
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                        <TextField
                            fullWidth
                            type="date"
                            label="From"
                            value={filters.from}
                            onChange={(e) => handleFieldChange('from')(e.target.value)}
                            slotProps={{ inputLabel: { shrink: true } }}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <TextField
                            fullWidth
                            type="date"
                            label="To"
                            value={filters.to}
                            onChange={(e) => handleFieldChange('to')(e.target.value)}
                            slotProps={{ inputLabel: { shrink: true } }}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Autocomplete
                            options={vendors}
                            getOptionLabel={(option) => option?.VendorName || ''}
                            isOptionEqualToValue={(option, value) => option.VendorID === value?.VendorID}
                            value={vendors.find((v) => v.VendorID === filters.vendorId) || null}
                            onChange={(e, newValue) => handleFieldChange('vendorId')(newValue?.VendorID || '')}
                            renderInput={(params) => <TextField {...params} label="Vendor" placeholder="All Vendors" />}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Autocomplete
                            options={plants}
                            getOptionLabel={(option) => option?.PlantName || option?.PlantCode || ''}
                            isOptionEqualToValue={(option, value) => option.PlantID === value?.PlantID}
                            value={plants.find((p) => p.PlantID === filters.plantId) || null}
                            onChange={(e, newValue) => handleFieldChange('plantId')(newValue?.PlantID || '')}
                            renderInput={(params) => <TextField {...params} label="Plant / Location" placeholder="All Plants" />}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <TextField
                            select
                            fullWidth
                            label="Status"
                            value={filters.statusId}
                            onChange={(e) => handleFieldChange('statusId')(e.target.value)}
                        >
                            <MenuItem value="">All Statuses</MenuItem>
                            {statuses.map((status) => (
                                <MenuItem key={status.StatusID} value={status.StatusID}>
                                    {status.StatusName}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                </Grid>
            </FilterPanel>

            <LoadingOverlay open={isDownloading} message="Generating Excel report..." />

            <AppSnackbar
                open={snackbar.open}
                severity={snackbar.severity}
                message={snackbar.message}
                onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
            />
        </Box>
    );
}
