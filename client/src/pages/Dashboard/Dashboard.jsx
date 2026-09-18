import React, { useEffect, useState } from 'react';
import { Box, FormControl, Select, MenuItem, InputLabel } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import PersonIcon from '@mui/icons-material/Person';

import PageHeader from '../../components/common/PageHeader';
import PageCard from '../../components/common/PageCard';
import StatCard from '../../components/common/StatCard';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import AppSnackbar from '../../components/common/AppSnackbar';
import DashboardFilters from '../../components/dashboard/DashboardFilters';
import MonthlyTrendChart from '../../components/dashboard/MonthlyTrendChart';
import VendorBarChart from '../../components/dashboard/VendorBarChart';
import * as dashboardService from '../../services/dashboardService';

const INITIAL_SUMMARY = {
    totalInvoices: 0,
    totalVendors: 0,
    totalCustomers: 0,
    activeContractCount: 0,
    discrepancyCount: 0,
    monthlyTrend: [],
    monthlyDiscrepancies: [],
    combinedTrend: [],
    vendorDistribution: [],
};

export default function Dashboard() {
    const [summary, setSummary] = useState(INITIAL_SUMMARY);
    const [loading, setLoading] = useState(true);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [appliedRange, setAppliedRange] = useState({ from: '', to: '' });
    const [draftRange, setDraftRange] = useState({ from: '', to: '' });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });

    // Chart type toggles state
    const [chartTypes, setChartTypes] = useState({
        vendor: 'bar',
        monthly: 'bar',
        discrepancy: 'bar',
        combined: 'bar',
    });

    const handleChartTypeChange = (chartKey, type) => {
        setChartTypes((prev) => ({ ...prev, [chartKey]: type }));
    };

    const fetchSummary = async (range) => {
        setLoading(true);
        try {
            const params = {};
            if (range.from) params.from = range.from;
            if (range.to) params.to = range.to;

            const res = await dashboardService.getDashboardSummary(params);
            setSummary(res.data?.data || INITIAL_SUMMARY);
        } catch (err) {
            setSnackbar({
                open: true,
                severity: 'error',
                message: err.response?.data?.message || 'Failed to load dashboard data.',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSummary(appliedRange);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleApplyFilters = () => {
        setAppliedRange(draftRange);
        fetchSummary(draftRange);
    };

    const handleResetFilters = () => {
        const cleared = { from: '', to: '' };
        setDraftRange(cleared);
        setAppliedRange(cleared);
        fetchSummary(cleared);
    };

    const metricCards = [
        {
            key: 'totalInvoices',
            title: 'Total Invoices',
            value: summary.totalInvoices.toLocaleString('en-IN'),
            icon: <ReceiptLongIcon />,
            color: 'primary',
        },
        {
            key: 'totalVendors',
            title: 'Total Vendors',
            value: summary.totalVendors.toLocaleString('en-IN'),
            icon: <PeopleOutlinedIcon />,
            color: 'success',
        },
        {
            key: 'totalCustomers',
            title: 'Total Customers',
            value: (summary.totalCustomers || 0).toLocaleString('en-IN'),
            icon: <PersonIcon />,
            color: 'info',
        },
        {
            key: 'activeContractCount',
            title: 'Total Active Contracts',
            value: summary.activeContractCount.toLocaleString('en-IN'),
            icon: <DescriptionOutlinedIcon />,
            color: 'primary',
        },
        {
            key: 'discrepancyCount',
            title: 'Total Discrepancies',
            value: summary.discrepancyCount.toLocaleString('en-IN'),
            icon: <ErrorOutlineIcon />,
            color: 'error',
        },
    ];

    const renderChartTypeSelector = (chartKey, currentType) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>Chart Type</InputLabel>
                <Select
                    value={currentType}
                    label="Chart Type"
                    onChange={(e) => handleChartTypeChange(chartKey, e.target.value)}
                >
                    <MenuItem value="bar">Bar Chart</MenuItem>
                    <MenuItem value="line">Line Chart</MenuItem>
                    <MenuItem value="pie">Pie Chart</MenuItem>
                </Select>
            </FormControl>
        </Box>
    );

    return (
        <Box sx={{ pb: 4, width: '100%' }}>
            <PageHeader
                title="Dashboard"
                subtitle="Overview of invoice volume, vendors, customers, and status across the business."
                buttonText="Date Range"
                onButtonClick={() => setFiltersOpen((prev) => !prev)}
            />

            <DashboardFilters
                open={filtersOpen}
                from={draftRange.from}
                to={draftRange.to}
                onFromChange={(value) => setDraftRange((prev) => ({ ...prev, from: value }))}
                onToChange={(value) => setDraftRange((prev) => ({ ...prev, to: value }))}
                onApply={handleApplyFilters}
                onReset={handleResetFilters}
            />

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(2, 1fr)',
                        md: 'repeat(3, 1fr)',
                        lg: 'repeat(5, 1fr)',
                    },
                    gap: 3,
                    mb: 3,
                }}
            >
                {metricCards.map((card) => (
                    <StatCard
                        key={card.key}
                        title={card.title}
                        value={card.value}
                        subtitle={card.title}
                        icon={card.icon}
                        color={card.color}
                    />
                ))}
            </Box>

            {/* Exactly 4 Charts in a strict 2x2 Matrix layout */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        lg: 'repeat(2, 1fr)',
                    },
                    gap: 3,
                }}
            >
                <PageCard sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {renderChartTypeSelector('vendor', chartTypes.vendor)}
                    <Box sx={{ flexGrow: 1, width: '100%' }}>
                        <VendorBarChart 
                            data={summary.vendorDistribution} 
                            type={chartTypes.vendor} 
                            title="Top Vendors by Invoice Count" 
                        />
                    </Box>
                </PageCard>

                <PageCard sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {renderChartTypeSelector('monthly', chartTypes.monthly)}
                    <Box sx={{ flexGrow: 1, width: '100%' }}>
                        <MonthlyTrendChart 
                            data={summary.monthlyTrend} 
                            type={chartTypes.monthly} 
                            title="Month Wise Invoices Count" 
                        />
                    </Box>
                </PageCard>

                <PageCard sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {renderChartTypeSelector('discrepancy', chartTypes.discrepancy)}
                    <Box sx={{ flexGrow: 1, width: '100%' }}>
                        <MonthlyTrendChart 
                            data={summary.monthlyDiscrepancies} 
                            type={chartTypes.discrepancy} 
                            title="Month Wise Discrepancies Count" 
                        />
                    </Box>
                </PageCard>

                <PageCard sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {renderChartTypeSelector('combined', chartTypes.combined)}
                    <Box sx={{ flexGrow: 1, width: '100%' }}>
                        <MonthlyTrendChart 
                            data={summary.combinedTrend} 
                            type={chartTypes.combined} 
                            title="Total Invoices and Total Discrepancies Count" 
                        />
                    </Box>
                </PageCard>
            </Box>

            <LoadingOverlay open={loading} message="Loading dashboard..." />

            <AppSnackbar
                open={snackbar.open}
                severity={snackbar.severity}
                message={snackbar.message}
                onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
            />
        </Box>
    );
}