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
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { parseDateForApi, toDayjsValue, DISPLAY_DATE_FORMAT } from '../../utils/dateFormat';

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

// Vehicle types are now sourced from the Vehicle Type Master via
// masterReferences.vehicleTypes (task item 9) rather than this hardcoded
// list, which used to silently diverge from the actual master data.

const createEmptyRow = (id, locationName = '') => ({
    id,
    locationName,
    vendorId: null,
    vendorName: '',
    gstNo: '',
    vendorGstId: null,
    customerName: '',
    invoiceBillNo: '',
    invoiceBillDate: '',
    lrDate: '',
    lrNo: '',
    vehicleType: '',
    vehicleTypeId: '',
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
// freeSolo defaults to true (existing behavior for GST/Customer cells, where
// typing a new value is allowed). Pass freeSolo={false} for cells that must
// only accept a value from the provided options list (e.g. ToStation).
const EditableAutocompleteCell = ({ value, options, placeholder, onChange, freeSolo = true }) => {
    return (
        <Autocomplete
            freeSolo={freeSolo}
            options={options}
            value={value || ''}
            onChange={(e, val) => onChange(val || '')}
            onInputChange={(e, val) => {
                // Only commit on every keystroke for freeSolo fields; for
                // select-only fields, committing happens via onChange when
                // an actual option is selected.
                if (freeSolo) onChange(val || '');
            }}
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
        vendors: [],    // [{ VendorID, VendorName }] — active vendors only
        vendorGsts: [], // [{ VendorGSTID, GSTNumber, VendorID, IsDefault }]
        customers: [],  // sourced from CustomerMaster (task item 6)
        toStations: [], // sourced from DestinationMaster city list
        // Contract No selector removed from Add Invoice entirely (task
        // item 13) - Vehicle Type/Destination are always sourced from the
        // full master lists below, never restricted to a specific
        // contract's rate matrix.
        vehicleTypes: [] // sourced from Vehicle Type Master, replacing the old hardcoded VEHICLE_TYPES list
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

                // 2. Fetch Invoice Suggestions (VendorGSTs, To Stations, and Customers from database)
                try {
                    const suggestionRes = await fetch('http://localhost:5000/api/invoices/invoice-suggestions', { method: 'GET', headers });
                    if (suggestionRes.ok && isMounted) {
                        const sJson = await suggestionRes.json();
                        const sData = sJson.data || {};
                        setMasterReferences(prev => ({
                            ...prev,
                            vendors: sData.vendors || [],
                            vendorGsts: sData.vendorGsts || [],
                            customers: sData.customers || [],
                            toStations: sData.toStations || []
                        }));
                    }
                } catch (err) {
                    console.warn("Could not fetch invoice suggestions API", err);
                }

                // Fetch Vehicle Type Master (task item 9's Vehicle Type sourcing
                // still applies; only the Contract No selector itself was
                // removed per task item 13 - replaces the old hardcoded
                // VEHICLE_TYPES list).
                try {
                    const vehicleTypesRes = await fetch('http://localhost:5000/api/masters/vehicle-types?pageSize=1000', { headers });
                    if (isMounted) {
                        const vehicleTypesJson = vehicleTypesRes.ok ? await vehicleTypesRes.json() : { data: [] };
                        setMasterReferences(prev => ({
                            ...prev,
                            vehicleTypes: (vehicleTypesJson.data || []).map(v => v.VehicleName).filter(Boolean),
                        }));
                    }
                } catch (err) {
                    console.warn("Could not fetch vehicle types", err);
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

    // CUSTOMER SELECTION: updates the row's customer name and, when the typed/
    // selected name isn't already in the Customer Master list, creates it via
    // the inline "+ Add Customer" endpoint so it becomes a reusable master
    // record without the uploader ever leaving the Add Invoice form (task 6).
    const handleCustomerChange = async (id, value) => {
        handleCellChange(id, 'customerName', value);

        const trimmedName = (value || '').trim();
        if (!trimmedName) return;

        const alreadyKnown = masterReferences.customers.some(
            (name) => name.toLowerCase() === trimmedName.toLowerCase()
        );
        if (alreadyKnown) return;

        try {
            let token = localStorage.getItem('token') || localStorage.getItem('accessToken') || "";
            const response = await fetch('http://localhost:5000/api/invoices/customers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ customerName: trimmedName }),
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok || result.success === false) {
                throw new Error(result.message || 'Unable to create customer.');
            }

            const savedName = result.data?.CustomerName || trimmedName;
            setMasterReferences((prev) => ({
                ...prev,
                customers: prev.customers.includes(savedName)
                    ? prev.customers
                    : [...prev.customers, savedName],
            }));
        } catch (err) {
            console.warn('Could not save new customer to Customer Master', err);
        }
    };

    // Returns the GST numbers belonging to a single vendor only (VendorGST.VendorID
    // match), so each row's GST dropdown never lists another vendor's GST numbers.
    // With no vendor selected yet, no options are offered.
    const getVendorGstOptions = (vendorId) => {
        if (!vendorId) return [];
        return masterReferences.vendorGsts
            .filter(v => Number(v.VendorID) === Number(vendorId))
            .map(v => v.GSTNumber)
            .filter(Boolean);
    };

    // GST SELECTION: Match VendorGST table data and automatically extract VendorGSTID and VendorID.
    // Matching is scoped to the row's already-selected vendor (when one is set) so a typed/selected
    // GST number is only ever resolved against that vendor's own GST records.
    const handleGstSelect = (id, gstValue, vendorId) => {
        const cleanGst = (gstValue || '').toUpperCase().trim();
        const candidateGsts = vendorId
            ? masterReferences.vendorGsts.filter(v => Number(v.VendorID) === Number(vendorId))
            : masterReferences.vendorGsts;
        const foundRecord = candidateGsts.find(v => (v.GSTNumber || '').toUpperCase() === cleanGst);
        const matchedVendor = foundRecord
            ? masterReferences.vendors.find(v => Number(v.VendorID) === Number(foundRecord.VendorID))
            : null;

        setRows(rows.map(row => {
            if (row.id !== id) return row;
            return {
                ...row,
                gstNo: cleanGst,
                vendorGstId: foundRecord ? foundRecord.VendorGSTID : null,
                vendorId: foundRecord ? foundRecord.VendorID : row.vendorId,
                vendorName: matchedVendor ? matchedVendor.VendorName : row.vendorName
            };
        }));
    };

    // VENDOR SELECTION: Selecting a vendor auto-populates that vendor's
    // active/default GST number (VendorGST.IsDefault), falling back to the
    // first GST on file for that vendor if none is flagged as default.
    const handleVendorSelect = (id, vendorOption) => {
        const vendorId = vendorOption ? vendorOption.VendorID : null;
        const vendorName = vendorOption ? (vendorOption.VendorName || '') : '';

        const vendorGstRecords = masterReferences.vendorGsts.filter(
            v => Number(v.VendorID) === Number(vendorId)
        );
        const defaultGst = vendorGstRecords.find(v => v.IsDefault) || vendorGstRecords[0] || null;

        setRows(rows.map(row => {
            if (row.id !== id) return row;
            return {
                ...row,
                vendorId,
                vendorName,
                gstNo: defaultGst ? (defaultGst.GSTNumber || '').toUpperCase().trim() : '',
                vendorGstId: defaultGst ? defaultGst.VendorGSTID : null
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

        // Vehicle Type is a mandatory field on every row being submitted.
        const missingVehicleTypeRow = validRows.find(r => !r.vehicleType || !r.vehicleType.trim());
        if (missingVehicleTypeRow) {
            setSnackbar({ open: true, message: 'Vehicle Type is required for every invoice row.', severity: 'error' });
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

            // Bug fix (task item 12): "Conversion failed when converting date
            // and/or time from character string." - re-normalize every date
            // field through parseDateForApi/dayjs right before building the
            // payload, so whatever ends up in row state (a valid ISO string,
            // an empty string, a stray locale-formatted string, etc.) is
            // guaranteed to reach the API as either a real YYYY-MM-DD value
            // or null - never a string SQL Server can't parse as a date.
            const normalizeDateForApi = (value, fallbackToToday = false) => {
                const normalized = parseDateForApi(toDayjsValue(value));
                if (normalized) return normalized;
                return fallbackToToday ? new Date().toISOString().split('T')[0] : null;
            };

            const formData = new FormData();
            const payloadRows = validRows.map((r) => ({
                locationId: selectedLocation?.LocationID || selectedLocation?.locationID || null,
                locationName: r.locationName,
                // Plant is selected by the user in Step 1 and never shown again
                // in the grid — sent hidden here so the server still receives it.
                plantId: selectedPlant?.PlantHierarchyID || selectedPlant?.plantHierarchyID || null,
                plantName: selectedPlant?.PlantName || selectedPlant?.plantName || null,
                vendorId: r.vendorId,
                vendorName: r.vendorName,
                gstNo: r.gstNo,
                vendorGstId: r.vendorGstId,
                customerName: r.customerName,
                invoiceNo: r.invoiceBillNo,
                invoiceDate: normalizeDateForApi(r.invoiceBillDate, true),
                lrDate: normalizeDateForApi(r.lrDate, true),
                lrNo: r.lrNo,
                vehicleType: r.vehicleType,
                vehicleTypeId: r.vehicleTypeId || null,
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
        <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1000, mx: 'auto', backgroundColor: '#f0f2f5', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
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
                                            <TableCell sx={{ minWidth: 200 }}>Vendor Name *</TableCell>
                                            <TableCell sx={{ minWidth: 170 }}>GST NO * (VendorGST Master)</TableCell>
                                            <TableCell sx={{ minWidth: 200 }}>Customer Name *</TableCell>
                                            <TableCell sx={{ minWidth: 150 }}>Invoice / Bill No *</TableCell>
                                            <TableCell sx={{ minWidth: 130 }}>Invoice Date *</TableCell>
                                            <TableCell sx={{ minWidth: 130 }}>LR Date *</TableCell>
                                            <TableCell sx={{ minWidth: 130 }}>LR NO *</TableCell>
                                            <TableCell sx={{ minWidth: 160 }}>Vehicle Type </TableCell>
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

                                                {/* 1. Vendor Name Autocomplete — selecting a vendor auto-fills GST NO below */}
                                                <TableCell onClick={() => setSelectedCell({ rowId: row.id, field: 'vendorName' })}>
                                                    <Autocomplete
                                                        options={masterReferences.vendors}
                                                        getOptionLabel={(o) => o?.VendorName || ''}
                                                        isOptionEqualToValue={(o, v) => Number(o?.VendorID) === Number(v?.VendorID)}
                                                        value={masterReferences.vendors.find(v => Number(v.VendorID) === Number(row.vendorId)) || null}
                                                        onChange={(e, val) => handleVendorSelect(row.id, val)}
                                                        renderInput={(params) => (
                                                            <TextField
                                                                {...params}
                                                                placeholder="Search Vendor..."
                                                                size="small"
                                                                variant="standard"
                                                                InputProps={{ ...params.InputProps, disableUnderline: true }}
                                                                inputProps={{ ...params.inputProps, style: { padding: '6px 8px', fontSize: '0.82rem' } }}
                                                            />
                                                        )}
                                                    />
                                                </TableCell>

                                                {/* 2. GST NO Autocomplete — options are scoped to the vendor
                                                    selected in this row (VendorGST.VendorID match) so the
                                                    dropdown never shows other vendors' GST numbers. Until a
                                                    vendor is picked, no GST options are offered. */}
                                                <TableCell onClick={() => setSelectedCell({ rowId: row.id, field: 'gstNo' })}>
                                                    <EditableAutocompleteCell
                                                        value={row.gstNo}
                                                        options={getVendorGstOptions(row.vendorId)}
                                                        placeholder="Type/Select GST..."
                                                        onChange={(val) => handleGstSelect(row.id, val, row.vendorId)}
                                                    />
                                                </TableCell>

                                                {/* 3. Customer Name Autocomplete — sourced from Customer Master;
                                                    typing a new name inline-creates it there too (task item 6) */}
                                                <TableCell onClick={() => setSelectedCell({ rowId: row.id, field: 'customerName' })}>
                                                    <EditableAutocompleteCell
                                                        value={row.customerName}
                                                        options={masterReferences.customers}
                                                        placeholder="Customer Name... (type to add new)"
                                                        onChange={(val) => handleCustomerChange(row.id, val)}
                                                    />
                                                </TableCell>

                                                <TableCell onClick={() => setSelectedCell({ rowId: row.id, field: 'invoiceBillNo' })}>
                                                    <TextField value={row.invoiceBillNo} onChange={(e) => handleCellChange(row.id, 'invoiceBillNo', e.target.value)} placeholder="INV-001" size="small" fullWidth variant="standard" slotProps={{ input: { disableUnderline: true }, htmlInput: { style: { padding: '6px 8px', fontSize: '0.82rem' } } }} />
                                                </TableCell>
                                                <TableCell onClick={() => setSelectedCell({ rowId: row.id, field: 'invoiceBillDate' })}>
                                                    <DatePicker
                                                        value={toDayjsValue(row.invoiceBillDate)}
                                                        onChange={(newValue) => handleCellChange(row.id, 'invoiceBillDate', parseDateForApi(newValue))}
                                                        format={DISPLAY_DATE_FORMAT}
                                                        slotProps={{ textField: { size: 'small', fullWidth: true, variant: 'standard', slotProps: { input: { disableUnderline: true }, inputLabel: { shrink: true }, htmlInput: { style: { padding: '6px 8px', fontSize: '0.82rem' } } } } }}
                                                    />
                                                </TableCell>
                                                <TableCell onClick={() => setSelectedCell({ rowId: row.id, field: 'lrDate' })}>
                                                    <DatePicker
                                                        value={toDayjsValue(row.lrDate)}
                                                        onChange={(newValue) => handleCellChange(row.id, 'lrDate', parseDateForApi(newValue))}
                                                        format={DISPLAY_DATE_FORMAT}
                                                        slotProps={{ textField: { size: 'small', fullWidth: true, variant: 'standard', slotProps: { input: { disableUnderline: true }, inputLabel: { shrink: true }, htmlInput: { style: { padding: '6px 8px', fontSize: '0.82rem' } } } } }}
                                                    />
                                                </TableCell>
                                                <TableCell onClick={() => setSelectedCell({ rowId: row.id, field: 'lrNo' })}>
                                                    <TextField value={row.lrNo} onChange={(e) => handleCellChange(row.id, 'lrNo', e.target.value)} placeholder="LR No" size="small" fullWidth variant="standard" slotProps={{ input: { disableUnderline: true }, htmlInput: { style: { padding: '6px 8px', fontSize: '0.82rem' } } }} />
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
                                                        <MenuItem value="" disabled>-- Select Vehicle Type --</MenuItem>
                                                        {masterReferences.vehicleTypes.map((t, idx) => (
                                                            <MenuItem key={idx} value={t} sx={{ fontSize: '0.82rem' }}>
                                                                {t}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </TableCell>

                                                {/* 4. TO (Destination) Autocomplete — sourced from DestinationMaster
                                                    city list (task item 13: no longer restricted by a Contract No
                                                    selection, since that field was removed from this form). */}
                                                <TableCell onClick={() => setSelectedCell({ rowId: row.id, field: 'to' })}>
                                                    <EditableAutocompleteCell
                                                        value={row.to}
                                                        options={masterReferences.toStations}
                                                        placeholder="Destination"
                                                        onChange={(val) => handleCellChange(row.id, 'to', val)}
                                                        freeSolo={false}
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
        </LocalizationProvider>
    );
}
