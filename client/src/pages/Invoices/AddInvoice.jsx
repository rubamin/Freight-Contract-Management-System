import React, { useState, useMemo, useEffect } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Button,
    TextField,
    Autocomplete,
    MenuItem,
    Select,
    Checkbox,
    IconButton,
    Alert,
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Divider
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    CloudUpload as UploadIcon,
    Close as CloseIcon,
    ZoomIn as ZoomInIcon,
    ZoomOut as ZoomOutIcon,
    ArrowForward as ArrowForwardIcon,
    EditLocation as EditLocationIcon,
    GridOn as GridOnIcon,
    Save as SaveIcon
} from '@mui/icons-material';

// --- CONFIGURATION & CONSTANTS ---
const MAX_ROWS = 25;
const ZOOM_LEVELS = [75, 90, 100, 110, 125, 140];
const ALLOWED_FILE_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];
const MAX_FILE_SIZE_MB = 5;

const VEHICLE_TYPES = [
    'Open Truck 10-Tyre',
    'Open Truck 6-Tyre',
    'Container 20ft',
    'Container 40ft',
    'Trailer High Bed',
    'Trailer Low Bed',
    'LCV / Tempo'
];

const createEmptyRow = (id, locationName = '') => ({
    id,
    locationName,
    gstNo: '',
    vendorGstId: null,
    vendorId: null,
    customerName: '',
    invoiceBillNo: '',
    invoiceBillDate: '',
    lrDate: '',
    lrNo: '',
    vehicleNo: '',
    vehicleType: '',
    vehicleTypeId: '',
    from: '',
    to: '',
    actualWeightMT: '',
    freightCharge: '',
    detainCharge: '0',
    extraCharge: '0',
    total: 0,
    remarks: '',
    isPreApproved: false,
    supportingDoc1: null,
    supportingDoc2: null,
    supportingDoc3: null
});

// --- REUSABLE AUTOCOMPLETE CELL COMPONENT ---
const EditableAutocompleteCell = ({ value, options, placeholder, onChange }) => {
    return (
        <Autocomplete
            freeSolo
            options={options}
            value={value || ''}
            onChange={(e, val) => onChange(val || '')}
            onInputChange={(e, val) => onChange(val || '')}
            renderInput={(params) => (
                <TextField
                    {...params}
                    placeholder={placeholder}
                    size="small"
                    variant="standard"
                    InputProps={{
                        ...params.InputProps,
                        disableUnderline: true,
                    }}
                    inputProps={{
                        ...params.inputProps,
                        style: { padding: '6px 8px', fontSize: '0.82rem' }
                    }}
                />
            )}
        />
    );
};

export default function AddInvoice() {
    // --- STATE MANAGEMENT ---
    const [step, setStep] = useState(1);
    
    // Hierarchy Master Data
    const [hierarchy, setHierarchy] = useState({ companies: [], sbus: [], plants: [], locations: [] });
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [selectedSbu, setSelectedSbu] = useState(null);
    const [selectedPlant, setSelectedPlant] = useState(null);
    const [selectedLocation, setSelectedLocation] = useState(null);

    // Dynamic Master References fetched from backend API
    const [masterReferences, setMasterReferences] = useState({
        vendorGsts: [], // [{ VendorGSTID, GSTNumber, VendorID }]
        customers: [],  // fetched dynamically from InvoiceHeader CustomerName
        fromStations: [],
        toStations: []
    });

    // Spreadsheet Grid State
    const [zoom, setZoom] = useState(100);
    const [rows, setRows] = useState([createEmptyRow(1)]);
    const [selectedCell, setSelectedCell] = useState({ rowId: 1, field: 'gstNo' });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- INITIAL FETCH FROM BACKEND METADATA & SUGGESTIONS API ---
    useEffect(() => {
        let isMounted = true;
        const fetchAllMasterData = async () => {
            try {
                let token = "";
                const authDataStr = localStorage.getItem('freight_contract_auth');
                if (authDataStr) {
                    try {
                        const parsedAuth = JSON.parse(authDataStr);
                        token = parsedAuth.token || "";
                    } catch (e) {
                        console.error("Failed parsing auth storage item context", e);
                    }
                }
                if (!token) {
                    token = localStorage.getItem('token') || localStorage.getItem('accessToken') || "";
                }

                const headers = {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                };

                // 1. Fetch Hierarchy Metadata
                const metaRes = await fetch('http://localhost:5000/api/settings/metadata', { method: 'GET', headers });
                if (metaRes.ok && isMounted) {
                    const resultJson = await metaRes.json();
                    const data = resultJson.data || resultJson;
                    setHierarchy({
                        companies: data.companies || [],
                        sbus: data.sbus || [],
                        plants: data.plants || [],
                        locations: data.locations || []
                    });
                } else {
                    setHierarchy({
                        companies: [{ CompanyID: 1, CompanyName: 'Rubamin' }],
                        sbus: [{ SBUID: 1, CompanyID: 1, SBUName: 'Zinc' }],
                        plants: [{ PlantHierarchyID: 1, SBUID: 1, PlantName: 'Halol' }],
                        locations: [{ LocationID: 1, PlantHierarchyID: 1, LocationName: 'R1H4' }]
                    });
                }

                // 2. Fetch Invoice Suggestions (VendorGSTs, From, To Stations, and Customers from database)
                try {
                    const suggestionRes = await fetch('http://localhost:5000/api/invoices/invoice-suggestions', { method: 'GET', headers });
                    if (suggestionRes.ok && isMounted) {
                        const sJson = await suggestionRes.json();
                        const sData = sJson.data || {};
                        setMasterReferences(prev => ({
                            ...prev,
                            vendorGsts: sData.vendorGsts || [],
                            customers: sData.customers || [],
                            fromStations: sData.fromStations || [],
                            toStations: sData.toStations || []
                        }));
                    }
                } catch (err) {
                    console.warn("Could not fetch invoice suggestions API", err);
                }

            } catch (error) {
                console.error("Failed to load master references", error);
            }
        };

        fetchAllMasterData();

        return () => {
            isMounted = false;
        };
    }, []);

    // --- CASCADING HIERARCHY COMPUTED OPTIONS ---
    const availableSbus = useMemo(() => {
        if (!selectedCompany) return [];
        return hierarchy.sbus.filter(s => Number(s.CompanyID) === Number(selectedCompany.CompanyID));
    }, [selectedCompany, hierarchy.sbus]);

    const availablePlants = useMemo(() => {
        if (!selectedSbu) return [];
        return hierarchy.plants.filter(p => Number(p.SBUID) === Number(selectedSbu.SBUID));
    }, [selectedSbu, hierarchy.plants]);

    const availableLocations = useMemo(() => {
        if (!selectedPlant) return [];
        return hierarchy.locations.filter(l => Number(l.PlantHierarchyID) === Number(selectedPlant.PlantHierarchyID));
    }, [selectedPlant, hierarchy.locations]);

    // --- HIERARCHY HANDLERS ---
    const handleCompanyChange = (e, val) => { setSelectedCompany(val); setSelectedSbu(null); setSelectedPlant(null); setSelectedLocation(null); };
    const handleSbuChange = (e, val) => { setSelectedSbu(val); setSelectedPlant(null); setSelectedLocation(null); };
    const handlePlantChange = (e, val) => { setSelectedPlant(val); setSelectedLocation(null); };
    const handleLocationChange = (e, val) => { setSelectedLocation(val); };

    const handleContinueHierarchy = () => {
        if (!selectedCompany || !selectedSbu || !selectedPlant || !selectedLocation) {
            setSnackbar({ open: true, message: 'Please select complete hierarchy location.', severity: 'error' });
            return;
        }
        const locName = selectedLocation.LocationName || selectedLocation.locationName || '';
        setRows(rows.map(r => ({ ...r, locationName: locName })));
        setStep(2);
    };

    // --- CELL LEVEL FAST TYPING & SMART AUTO-CONVERSION ---
    const handleCellChange = (id, field, value) => {
        setRows(rows.map(row => {
            if (row.id !== id) return row;

            let updatedRow = { ...row, [field]: value };

            if (field === 'gstNo') updatedRow.gstNo = value.toUpperCase().trim();
            if (field === 'vehicleNo') updatedRow.vehicleNo = value.toUpperCase().trim();

            if (field === 'actualWeightMT') {
                let numVal = parseFloat(value) || 0;
                if (numVal > 1000) {
                    updatedRow.actualWeightMT = (numVal / 1000).toFixed(2);
                } else {
                    updatedRow.actualWeightMT = value;
                }
            }

            if (['freightCharge', 'detainCharge', 'extraCharge'].includes(field)) {
                const freight = parseFloat(updatedRow.freightCharge) || 0;
                const detain = parseFloat(updatedRow.detainCharge) || 0;
                const extra = parseFloat(updatedRow.extraCharge) || 0;
                updatedRow.total = freight + detain + extra;
            }

            return updatedRow;
        }));
    };

    // GST SELECTION: Match VendorGST table data and automatically extract VendorGSTID and VendorID
    const handleGstSelect = (id, gstValue) => {
        const cleanGst = (gstValue || '').toUpperCase().trim();
        const foundRecord = masterReferences.vendorGsts.find(v => (v.GSTNumber || '').toUpperCase() === cleanGst);

        setRows(rows.map(row => {
            if (row.id !== id) return row;
            return {
                ...row,
                gstNo: cleanGst,
                vendorGstId: foundRecord ? foundRecord.VendorGSTID : null,
                vendorId: foundRecord ? foundRecord.VendorID : null
            };
        }));
    };

    // --- FILE UPLOAD HANDLERS ---
    const handleFileUpload = (id, docField, e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            setSnackbar({ open: true, message: 'Unsupported file format.', severity: 'error' });
            return;
        }
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            setSnackbar({ open: true, message: `File size exceeds limit (${MAX_FILE_SIZE_MB}MB).`, severity: 'error' });
            return;
        }
        setRows(rows.map(r => r.id === id ? { ...r, [docField]: file } : r));
    };

    const handleRemoveFile = (id, docField) => {
        setRows(rows.map(r => r.id === id ? { ...r, [docField]: null } : r));
    };

    // --- ROW MANAGEMENT ---
    const handleAddRow = () => {
        if (rows.length >= MAX_ROWS) return;
        const locName = selectedLocation?.LocationName || selectedLocation?.locationName || '';
        setRows([...rows, createEmptyRow(rows.length + 1, locName)]);
    };

    const handleDeleteRow = (id) => {
        const locName = selectedLocation?.LocationName || selectedLocation?.locationName || '';
        if (rows.length === 1) {
            setRows([createEmptyRow(1, locName)]);
            return;
        }
        setRows(rows.filter(r => r.id !== id));
    };

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 15, ZOOM_LEVELS[ZOOM_LEVELS.length - 1]));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 15, ZOOM_LEVELS[0]));

    const totalValidRows = useMemo(() => rows.filter(r => r.invoiceBillNo.trim() !== '').length, [rows]);

    // --- FINAL VALIDATION & SUBMISSION ---
    const handleSaveInvoices = async () => {
        const validRows = rows.filter(r => r.invoiceBillNo.trim() !== '');
        if (validRows.length === 0) {
            setSnackbar({ open: true, message: 'Please enter at least one valid invoice row.', severity: 'error' });
            return;
        }

        setIsSubmitting(true);
        try {
            let token = localStorage.getItem('token') || localStorage.getItem('accessToken') || "";
            const authDataStr = localStorage.getItem('freight_contract_auth');
            if (authDataStr) {
                try {
                    const parsedAuth = JSON.parse(authDataStr);
                    token = parsedAuth.token || token;
                } catch (e) {}
            }

            const formData = new FormData();
            const payloadRows = validRows.map((r) => ({
                locationId: selectedLocation?.LocationID || selectedLocation?.locationID || null,
                locationName: r.locationName,
                gstNo: r.gstNo,
                vendorGstId: r.vendorGstId,
                vendorId: r.vendorId,
                customerName: r.customerName,
                invoiceNo: r.invoiceBillNo,
                invoiceDate: r.invoiceBillDate || new Date().toISOString().split('T')[0],
                lrDate: r.lrDate,
                lrNo: r.lrNo,
                vehicleNo: r.vehicleNo,
                vehicleType: r.vehicleType,
                vehicleTypeId: r.vehicleTypeId || null,
                fromStation: r.from,
                toStation: r.to,
                actualWeight: parseFloat(r.actualWeightMT) || 0,
                freightCharge: parseFloat(r.freightCharge) || 0,
                detainCharge: parseFloat(r.detainCharge) || 0,
                extraCharge: parseFloat(r.extraCharge) || 0,
                total: r.total,
                remarks: r.remarks,
                preAppr: r.isPreApproved ? "Yes" : "No",
                Doc1: r.supportingDoc1 ? r.supportingDoc1.name : null,
                Doc2: r.supportingDoc2 ? r.supportingDoc2.name : null,
                Doc3: r.supportingDoc3 ? r.supportingDoc3.name : null
            }));

            formData.append("invoices", JSON.stringify(payloadRows));

            validRows.forEach((r, index) => {
                if (r.supportingDoc1) formData.append(`doc1_${index}`, r.supportingDoc1);
                if (r.supportingDoc2) formData.append(`doc2_${index}`, r.supportingDoc2);
                if (r.supportingDoc3) formData.append(`doc3_${index}`, r.supportingDoc3);
            });

            const response = await fetch('http://localhost:5000/api/invoices/documents/upload', {
                method: 'POST',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                setSnackbar({ open: true, message: result.message || 'Invoices successfully saved & verified!', severity: 'success' });
                const locName = selectedLocation?.LocationName || selectedLocation?.locationName || '';
                setRows([createEmptyRow(1, locName)]);
                setStep(1);
            } else {
                setSnackbar({ open: true, message: result.message || 'Failed to process invoices.', severity: 'error' });
            }
        } catch (error) {
            console.error("Submission error:", error);
            setSnackbar({ open: true, message: 'Network or server error during invoice submission.', severity: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto', backgroundColor: '#f0f2f5', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
            {/* Header Title */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <GridOnIcon sx={{ color: '#107c41' }} /> Add Invoice — Lightning Excel Sheet
                </Typography>
                {step === 2 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: '#ffffff', px: 2, py: 0.8, borderRadius: 2, border: '1px solid #d1d5db' }}>
                        <Typography variant="caption" sx={{ color: '#4b5563', fontWeight: 600 }}>Active Cell:</Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                            Row {selectedCell.rowId} : {selectedCell.field.toUpperCase()}
                        </Typography>
                    </Box>
                )}
            </Box>

            {/* STEP 1: HIERARCHY SELECTOR */}
            {step === 1 && (
                <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', maxWidth: 650, mx: 'auto' }}>
                    <CardContent sx={{ p: 4 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3, color: '#111827', borderBottom: '2px solid #f3f4f6', pb: 1.5 }}>
                            Step 1: Select Location Hierarchy
                        </Typography>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                            <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.8, color: '#374151' }}>Company *</Typography>
                                <Autocomplete
                                    options={hierarchy.companies}
                                    getOptionLabel={(o) => o?.CompanyName || o?.companyName || ''}
                                    value={selectedCompany}
                                    onChange={handleCompanyChange}
                                    renderInput={(params) => <TextField {...params} placeholder="Select Company" size="small" />}
                                />
                            </Box>
                            <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.8, color: '#374151' }}>SBU *</Typography>
                                <Autocomplete
                                    options={availableSbus}
                                    getOptionLabel={(o) => o?.SBUName || o?.sbuName || ''}
                                    value={selectedSbu}
                                    onChange={handleSbuChange}
                                    disabled={!selectedCompany}
                                    renderInput={(params) => <TextField {...params} placeholder="Select SBU" size="small" />}
                                />
                            </Box>
                            <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.8, color: '#374151' }}>Plant *</Typography>
                                <Autocomplete
                                    options={availablePlants}
                                    getOptionLabel={(o) => o?.PlantName || o?.plantName || ''}
                                    value={selectedPlant}
                                    onChange={handlePlantChange}
                                    disabled={!selectedSbu}
                                    renderInput={(params) => <TextField {...params} placeholder="Select Plant" size="small" />}
                                />
                            </Box>
                            <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.8, color: '#374151' }}>Location *</Typography>
                                <Autocomplete
                                    options={availableLocations}
                                    getOptionLabel={(o) => o?.LocationName || o?.locationName || ''}
                                    value={selectedLocation}
                                    onChange={handleLocationChange}
                                    disabled={!selectedPlant}
                                    renderInput={(params) => <TextField {...params} placeholder="Select Location" size="small" />}
                                />
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                                <Button
                                    variant="contained"
                                    endIcon={<ArrowForwardIcon />}
                                    onClick={handleContinueHierarchy}
                                    disabled={!selectedLocation}
                                    sx={{ textTransform: 'none', px: 4, py: 1.2, fontWeight: 700, borderRadius: 2, backgroundColor: '#107c41', '&:hover': { backgroundColor: '#0b5c31' }, boxShadow: 'none' }}
                                >
                                    Next
                                </Button>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            )}

            {/* STEP 2: LIGHTNING EXCEL SPREADSHEET GRID */}
            {step === 2 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    {/* Active Context Bar */}
                    <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: '#ffffff', border: '1px solid #d1d5db' }}>
                        <CardContent sx={{ p: '12px 20px !important', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Typography variant="body1" sx={{ fontWeight: 700, color: '#111827' }}>
                                    {selectedCompany?.CompanyName || selectedCompany?.companyName}
                                </Typography>
                                <Divider orientation="vertical" flexItem />
                                <Typography variant="body2" sx={{ color: '#374151', fontWeight: 500 }}>
                                    {selectedSbu?.SBUName || selectedSbu?.sbuName} → {selectedPlant?.PlantName || selectedPlant?.plantName} → <strong style={{ color: '#107c41' }}>{selectedLocation?.LocationName || selectedLocation?.locationName}</strong>
                                </Typography>
                            </Box>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<EditLocationIcon />}
                                onClick={() => setStep(1)}
                                sx={{ textTransform: 'none', borderColor: '#d1d5db', color: '#374151', fontWeight: 600 }}
                            >
                                Change Location
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Toolbar Ribbon */}
                    <Card variant="outlined" sx={{ borderRadius: 2, backgroundColor: '#ffffff', border: '1px solid #d1d5db' }}>
                        <CardContent sx={{ p: '10px 16px !important', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Button
                                    variant="contained"
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={handleAddRow}
                                    disabled={rows.length >= MAX_ROWS}
                                    sx={{ textTransform: 'none', fontWeight: 600, backgroundColor: '#107c41', '&:hover': { backgroundColor: '#0b5c31' }, boxShadow: 'none' }}
                                >
                                    Insert Row
                                </Button>
                                <Typography variant="body2" sx={{ color: '#4b5563', fontWeight: 600, px: 1, borderLeft: '2px solid #e5e7eb' }}>
                                    Rows: <span style={{ color: '#111827' }}>{rows.length}</span> / {MAX_ROWS}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#f3f4f6', p: '2px 8px', borderRadius: 1.5, border: '1px solid #e5e7eb' }}>
                                <IconButton size="small" onClick={handleZoomOut} disabled={zoom <= ZOOM_LEVELS[0]}><ZoomOutIcon fontSize="small" /></IconButton>
                                <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 35, textAlign: 'center' }}>{zoom}%</Typography>
                                <IconButton size="small" onClick={handleZoomIn} disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}><ZoomInIcon fontSize="small" /></IconButton>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Spreadsheet Table Grid */}
                    <Card variant="outlined" sx={{ borderRadius: 2, backgroundColor: '#ffffff', border: '1px solid #d1d5db' }}>
                        <CardContent sx={{ p: 0 }}>
                            <TableContainer
                                component={Paper}
                                variant="outlined"
                                sx={{
                                    maxHeight: 520,
                                    maxWidth: '100%',
                                    overflowX: 'auto',
                                    border: 'none',
                                    transform: `scale(${zoom / 100})`,
                                    transformOrigin: 'top left',
                                    transition: 'transform 0.1s ease-in-out',
                                    '& th': { backgroundColor: '#f3f4f6', color: '#374151', fontWeight: 700, borderRight: '1px solid #e5e7eb', padding: '8px 10px', fontSize: '0.8rem' },
                                    '& td': { whiteSpace: 'nowrap', padding: '2px 4px', borderColor: '#e5e7eb', borderRight: '1px solid #f1f5f9', backgroundColor: '#ffffff' }
                                }}
                            >
                                <Table stickyHeader size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ minWidth: 45, backgroundColor: '#e5e7eb !important', textAlign: 'center', fontWeight: 800 }}>#</TableCell>
                                            <TableCell sx={{ minWidth: 130 }}>Location</TableCell>
                                            <TableCell sx={{ minWidth: 170 }}>GST NO * (VendorGST Master)</TableCell>
                                            <TableCell sx={{ minWidth: 200 }}>Customer Name *</TableCell>
                                            <TableCell sx={{ minWidth: 150 }}>Invoice / Bill No *</TableCell>
                                            <TableCell sx={{ minWidth: 130 }}>Invoice Date *</TableCell>
                                            <TableCell sx={{ minWidth: 130 }}>LR Date *</TableCell>
                                            <TableCell sx={{ minWidth: 130 }}>LR NO *</TableCell>
                                            <TableCell sx={{ minWidth: 130 }}>Vehicle No *</TableCell>
                                            <TableCell sx={{ minWidth: 160 }}>Vehicle Type </TableCell>
                                            <TableCell sx={{ minWidth: 140 }}>From *</TableCell>
                                            <TableCell sx={{ minWidth: 140 }}>To *</TableCell>
                                            <TableCell sx={{ minWidth: 130, textAlign: 'right' }}>Actual Wt (MT/KG)*</TableCell>
                                            <TableCell sx={{ minWidth: 120, textAlign: 'right' }}>Freight Chg</TableCell>
                                            <TableCell sx={{ minWidth: 110, textAlign: 'right' }}>Detain Chg</TableCell>
                                            <TableCell sx={{ minWidth: 110, textAlign: 'right' }}>Extra Chg</TableCell>
                                            <TableCell sx={{ minWidth: 120, textAlign: 'right', backgroundColor: '#e6f4ea !important', color: '#137333 !important' }}>Total</TableCell>
                                            <TableCell sx={{ minWidth: 180 }}>Remarks</TableCell>
                                            <TableCell sx={{ minWidth: 90, textAlign: 'center' }}>Pre-Appr</TableCell>
                                            <TableCell sx={{ minWidth: 150 }}>Doc 1</TableCell>
                                            <TableCell sx={{ minWidth: 150 }}>Doc 2</TableCell>
                                            <TableCell sx={{ minWidth: 150 }}>Doc 3</TableCell>
                                            <TableCell sx={{ minWidth: 50, textAlign: 'center' }}>Del</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {rows.map((row, index) => (
                                            <TableRow key={row.id} hover>
                                                <TableCell sx={{ backgroundColor: '#f9fafb', textAlign: 'center', fontWeight: 700, color: '#6b7280', fontSize: '0.75rem', borderRight: '2px solid #cbd5e1' }}>
                                                    {index + 1}
                                                </TableCell>
                                                <TableCell sx={{ color: '#4b5563', fontWeight: 600, fontSize: '0.82rem' }}>{row.locationName}</TableCell>

                                                {/* 1. GST NO Autocomplete */}
                                                <TableCell onClick={() => setSelectedCell({ rowId: row.id, field: 'gstNo' })}>
                                                    <EditableAutocompleteCell
                                                        value={row.gstNo}
                                                        options={masterReferences.vendorGsts.map(v => v.GSTNumber).filter(Boolean)}
                                                        placeholder="Type/Select GST..."
                                                        onChange={(val) => handleGstSelect(row.id, val)}
                                                    />
                                                </TableCell>

                                                {/* 2. Customer Name Autocomplete */}
                                                <TableCell onClick={() => setSelectedCell({ rowId: row.id, field: 'customerName' })}>
                                                    <EditableAutocompleteCell
                                                        value={row.customerName}
                                                        options={masterReferences.customers}
                                                        placeholder="Customer Name..."
                                                        onChange={(val) => handleCellChange(row.id, 'customerName', val)}
                                                    />
                                                </TableCell>

                                                <TableCell onClick={() => setSelectedCell({ rowId: row.id, field: 'invoiceBillNo' })}>
                                                    <TextField value={row.invoiceBillNo} onChange={(e) => handleCellChange(row.id, 'invoiceBillNo', e.target.value)} placeholder="INV-001" size="small" fullWidth variant="standard" slotProps={{ input: { disableUnderline: true }, htmlInput: { style: { padding: '6px 8px', fontSize: '0.82rem' } } }} />
                                                </TableCell>
                                                <TableCell onClick={() => setSelectedCell({ rowId: row.id, field: 'invoiceBillDate' })}>
                                                    <TextField type="date" value={row.invoiceBillDate} onChange={(e) => handleCellChange(row.id, 'invoiceBillDate', e.target.value)} size="small" fullWidth variant="standard" slotProps={{ input: { disableUnderline: true }, inputLabel: { shrink: true }, htmlInput: { style: { padding: '6px 8px', fontSize: '0.82rem' } } }} />
                                                </TableCell>
                                                <TableCell onClick={() => setSelectedCell({ rowId: row.id, field: 'lrDate' })}>
                                                    <TextField type="date" value={row.lrDate} onChange={(e) => handleCellChange(row.id, 'lrDate', e.target.value)} size="small" fullWidth variant="standard" slotProps={{ input: { disableUnderline: true }, inputLabel: { shrink: true }, htmlInput: { style: { padding: '6px 8px', fontSize: '0.82rem' } } }} />
                                                </TableCell>
                                                <TableCell onClick={() => setSelectedCell({ rowId: row.id, field: 'lrNo' })}>
                                                    <TextField value={row.lrNo} onChange={(e) => handleCellChange(row.id, 'lrNo', e.target.value)} placeholder="LR No" size="small" fullWidth variant="standard" slotProps={{ input: { disableUnderline: true }, htmlInput: { style: { padding: '6px 8px', fontSize: '0.82rem' } } }} />
                                                </TableCell>
                                                <TableCell onClick={() => setSelectedCell({ rowId: row.id, field: 'vehicleNo' })}>
                                                    <TextField value={row.vehicleNo} onChange={(e) => handleCellChange(row.id, 'vehicleNo', e.target.value)} placeholder="GJ01AB1234" size="small" fullWidth variant="standard" slotProps={{ input: { disableUnderline: true }, htmlInput: { style: { padding: '6px 8px', fontSize: '0.82rem' } } }} />
                                                </TableCell>
                                                <TableCell onClick={() => setSelectedCell({ rowId: row.id, field: 'vehicleType' })}>
                                                    <Select 
                                                        value={row.vehicleType} 
                                                        onChange={(e) => handleCellChange(row.id, 'vehicleType', e.target.value)} 
                                                        displayEmpty 
                                                        size="small" 
                                                        fullWidth 
                                                        variant="standard" 
                                                        disableUnderline 
                                                        sx={{ fontSize: '0.82rem', '& .MuiSelect-select': { py: 0.5, px: 1 } }}
                                                    >
                                                        <MenuItem value="">-- None / Optional --</MenuItem>
                                                        {VEHICLE_TYPES.map((t, idx) => (
                                                            <MenuItem key={idx} value={t} sx={{ fontSize: '0.82rem' }}>
                                                                {t}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </TableCell>

                                                {/* 3. FROM (Origin) Autocomplete */}
                                                <TableCell onClick={() => setSelectedCell({ rowId: row.id, field: 'from' })}>
                                                    <EditableAutocompleteCell
                                                        value={row.from}
                                                        options={masterReferences.fromStations}
                                                        placeholder="Origin"
                                                        onChange={(val) => handleCellChange(row.id, 'from', val)}
                                                    />
                                                </TableCell>

                                                {/* 4. TO (Destination) Autocomplete */}
                                                <TableCell onClick={() => setSelectedCell({ rowId: row.id, field: 'to' })}>
                                                    <EditableAutocompleteCell
                                                        value={row.to}
                                                        options={masterReferences.toStations}
                                                        placeholder="Destination"
                                                        onChange={(val) => handleCellChange(row.id, 'to', val)}
                                                    />
                                                </TableCell>

                                                <TableCell onClick={() => setSelectedCell({ rowId: row.id, field: 'actualWeightMT' })}>
                                                    <TextField type="number" value={row.actualWeightMT} onChange={(e) => handleCellChange(row.id, 'actualWeightMT', e.target.value)} placeholder="0.00 MT" size="small" fullWidth variant="standard" slotProps={{ input: { disableUnderline: true }, htmlInput: { style: { padding: '6px 8px', fontSize: '0.82rem', textAlign: 'right' } } }} />
                                                </TableCell>
                                                <TableCell onClick={() => setSelectedCell({ rowId: row.id, field: 'freightCharge' })}>
                                                    <TextField type="number" value={row.freightCharge} onChange={(e) => handleCellChange(row.id, 'freightCharge', e.target.value)} placeholder="0.00" size="small" fullWidth variant="standard" slotProps={{ input: { disableUnderline: true }, htmlInput: { style: { padding: '6px 8px', fontSize: '0.82rem', textAlign: 'right' } } }} />
                                                </TableCell>
                                                <TableCell onClick={() => setSelectedCell({ rowId: row.id, field: 'detainCharge' })}>
                                                    <TextField type="number" value={row.detainCharge} onChange={(e) => handleCellChange(row.id, 'detainCharge', e.target.value)} placeholder="0" size="small" fullWidth variant="standard" slotProps={{ input: { disableUnderline: true }, htmlInput: { style: { padding: '6px 8px', fontSize: '0.82rem', textAlign: 'right' } } }} />
                                                </TableCell>
                                                <TableCell onClick={() => setSelectedCell({ rowId: row.id, field: 'extraCharge' })}>
                                                    <TextField type="number" value={row.extraCharge} onChange={(e) => handleCellChange(row.id, 'extraCharge', e.target.value)} placeholder="0" size="small" fullWidth variant="standard" slotProps={{ input: { disableUnderline: true }, htmlInput: { style: { padding: '6px 8px', fontSize: '0.82rem', textAlign: 'right' } } }} />
                                                </TableCell>

                                                <TableCell sx={{ textAlign: 'right', fontWeight: 700, color: '#137333', backgroundColor: '#f4fbf7 !important' }}>
                                                    ₹ {row.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </TableCell>

                                                <TableCell onClick={() => setSelectedCell({ rowId: row.id, field: 'remarks' })}>
                                                    <TextField value={row.remarks} onChange={(e) => handleCellChange(row.id, 'remarks', e.target.value)} placeholder="Remarks" size="small" fullWidth variant="standard" slotProps={{ input: { disableUnderline: true }, htmlInput: { style: { padding: '6px 8px', fontSize: '0.82rem' } } }} />
                                                </TableCell>
                                                <TableCell sx={{ textAlign: 'center' }}>
                                                    <Checkbox checked={row.isPreApproved} onChange={(e) => handleCellChange(row.id, 'isPreApproved', e.target.checked)} size="small" sx={{ color: '#107c41', '&.Mui-checked': { color: '#107c41' } }} />
                                                </TableCell>

                                                <TableCell>{row.supportingDoc1 ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: '#f1f5f9', p: 0.5, borderRadius: 1 }}><Typography variant="caption" noWrap sx={{ maxWidth: 80 }}>{row.supportingDoc1.name}</Typography><IconButton size="small" onClick={() => handleRemoveFile(row.id, 'supportingDoc1')}><CloseIcon fontSize="small" /></IconButton></Box> : <Button component="label" variant="text" size="small" startIcon={<UploadIcon fontSize="small" />} sx={{ textTransform: 'none', fontSize: '0.7rem', color: '#107c41' }}>Upload<input type="file" hidden onChange={(e) => handleFileUpload(row.id, 'supportingDoc1', e)} /></Button>}</TableCell>
                                                <TableCell>{row.supportingDoc2 ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: '#f1f5f9', p: 0.5, borderRadius: 1 }}><Typography variant="caption" noWrap sx={{ maxWidth: 80 }}>{row.supportingDoc2.name}</Typography><IconButton size="small" onClick={() => handleRemoveFile(row.id, 'supportingDoc2')}><CloseIcon fontSize="small" /></IconButton></Box> : <Button component="label" variant="text" size="small" startIcon={<UploadIcon fontSize="small" />} sx={{ textTransform: 'none', fontSize: '0.7rem', color: '#107c41' }}>Upload<input type="file" hidden onChange={(e) => handleFileUpload(row.id, 'supportingDoc2', e)} /></Button>}</TableCell>
                                                <TableCell>{row.supportingDoc3 ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: '#f1f5f9', p: 0.5, borderRadius: 1 }}><Typography variant="caption" noWrap sx={{ maxWidth: 80 }}>{row.supportingDoc3.name}</Typography><IconButton size="small" onClick={() => handleRemoveFile(row.id, 'supportingDoc3')}><CloseIcon fontSize="small" /></IconButton></Box> : <Button component="label" variant="text" size="small" startIcon={<UploadIcon fontSize="small" />} sx={{ textTransform: 'none', fontSize: '0.7rem', color: '#107c41' }}>Upload<input type="file" hidden onChange={(e) => handleFileUpload(row.id, 'supportingDoc3', e)} /></Button>}</TableCell>

                                                <TableCell sx={{ textAlign: 'center' }}>
                                                    <IconButton size="small" color="error" onClick={() => handleDeleteRow(row.id)}><DeleteIcon fontSize="small" /></IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 1 }}>
                        <Button variant="outlined" onClick={() => { setStep(1); setRows([createEmptyRow(1)]); }} sx={{ textTransform: 'none', px: 3, borderRadius: 2, fontWeight: 600, borderColor: '#d1d5db', color: '#374151' }}>Cancel</Button>
                        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveInvoices} disabled={isSubmitting || totalValidRows === 0} sx={{ textTransform: 'none', px: 4, py: 1.2, fontWeight: 700, borderRadius: 2, backgroundColor: '#107c41', '&:hover': { backgroundColor: '#0b5c31' }, boxShadow: 'none' }}>
                            {isSubmitting ? 'Saving Invoices...' : 'Save Invoices'}
                        </Button>
                    </Box>
                </Box>
            )}

            {/* Notification Snackbar */}
            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}