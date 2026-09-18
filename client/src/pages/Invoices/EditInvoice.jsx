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
    Paper
} from '@mui/material';
import {
    Delete as DeleteIcon,
    ZoomIn as ZoomInIcon,
    ZoomOut as ZoomOutIcon,
    GridOn as GridOnIcon,
    Save as SaveIcon,
    ArrowBack as ArrowBackIcon,
    Description as DescriptionIcon,
    UploadFile as UploadFileIcon,
    Close as CloseIcon
} from '@mui/icons-material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { parseDateForApi, toDayjsValue, DISPLAY_DATE_FORMAT } from '../../utils/dateFormat';

// --- CONFIGURATION & CONSTANTS (mirrors AddInvoice.jsx) ---
const ZOOM_LEVELS = [75, 90, 100, 110, 125, 140];

const getAuthHeaders = ({ json = true } = {}) => {
    let token = "";
    const authDataStr = localStorage.getItem('freight_contract_auth');
    if (authDataStr) {
        try {
            token = JSON.parse(authDataStr).token || "";
        } catch (e) {
            console.error("Failed parsing auth storage item context", e);
        }
    }
    if (!token) {
        token = localStorage.getItem('token') || localStorage.getItem('accessToken') || "";
    }
    return {
        // FormData requests must NOT set Content-Type manually - the browser
        // needs to add its own multipart boundary. Pass { json: false } for
        // those (see handleSaveChanges' attachment upload path).
        ...(json ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

// The three attachment slots every invoice has. A slot with an existing
// path is locked (view-only, see renderDocCell) - new uploads can only ever
// land in a slot that doesn't have one yet, whether picked directly for
// that empty slot or queued via a locked slot's "+ Upload" control.
const DOC_SLOTS = ['doc1', 'doc2', 'doc3'];
const getEmptyDocSlots = (row) => DOC_SLOTS.filter(slot => !row[`${slot}Path`]);

// Location Master entries carry a PlantHierarchyID (see AddInvoice.jsx's
// hierarchy.locations). Finding the invoice's current Location and taking
// every other Location sharing that same PlantHierarchyID gives exactly
// the set that already belongs to this invoice's Plant/SBU/Company - no
// need to separately track/select Company or SBU on this page. Falls back
// to the full list if the invoice's Location isn't recognized yet.
const getLocationOptionsForRow = (row, allLocations) => {
    const currentEntry = allLocations.find(l => Number(l.LocationID) === Number(row.locationId));
    if (!currentEntry) return allLocations;
    return allLocations.filter(l => Number(l.PlantHierarchyID) === Number(currentEntry.PlantHierarchyID));
};


// Maps a raw invoice record (as returned by GET /api/invoices/invoices/:id)
// into the same editable-row shape AddInvoice.jsx uses, so the two pages'
// grids stay in sync and both submit the same field names.
const mapInvoiceToRow = (invoice) => ({
    id: invoice.InvoiceID,
    invoiceId: invoice.InvoiceID,
    locationName: invoice.LocationName || invoice.plant?.PlantName || '-',
    // Real hierarchy Location (Location Master), not the Plants master -
    // see task: "Location dropdown — source from Location Master, not
    // Plant Master". Pre-selects the invoice's current Location.
    locationId: invoice.LocationID || null,
    vendorId: invoice.VendorID || null,
    vendorName: invoice.vendor?.VendorName || '',
    gstNo: invoice.vendorGST?.GSTNumber || '',
    vendorGstId: invoice.VendorGSTID || null,
    customerName: invoice.CustomerName || '',
    invoiceBillNo: invoice.InvoiceNumber || '',
    invoiceBillDate: invoice.InvoiceDate || '',
    lrDate: invoice.LRDate || '',
    lrNo: invoice.LRNumber || '',
    vehicleType: invoice.vehicleType?.VehicleName || '',
    vehicleTypeId: invoice.VehicleTypeID || '',
    to: invoice.ToStation || '',
    actualWeightMT: invoice.TotalWeight ?? '',
    freightCharge: invoice.BasicFreight ?? '',
    detainCharge: invoice.DetainCharges ?? '0',
    extraCharge: invoice.ExtraCharges ?? '0',
    total: parseFloat(invoice.TotalInvoiceAmount || 0),
    remarks: invoice.Remarks || '',
    isPreApproved: Boolean(invoice.IsPreApproved),
    doc1Path: invoice.Doc1Path || null,
    doc2Path: invoice.Doc2Path || null,
    doc3Path: invoice.Doc3Path || null,
    // New attachments queued for this row (not yet saved). Assigned into
    // whichever original Doc1/2/3 slots are empty, in order, at save time.
    pendingUploads: [],
});

// --- REUSABLE AUTOCOMPLETE CELL COMPONENT (mirrors AddInvoice.jsx) ---
const EditableAutocompleteCell = ({ value, options, placeholder, onChange, freeSolo = true }) => {
    return (
        <Autocomplete
            freeSolo={freeSolo}
            options={options}
            value={value || ''}
            onChange={(e, val) => onChange(val || '')}
            onInputChange={(e, val) => {
                if (freeSolo) onChange(val || '');
            }}
            renderInput={(params) => (
                <TextField
                    {...params}
                    placeholder={placeholder}
                    size="small"
                    variant="standard"
                    InputProps={{ ...params.InputProps, disableUnderline: true }}
                    inputProps={{ ...params.inputProps, style: { padding: '6px 8px', fontSize: '0.82rem' } }}
                />
            )}
        />
    );
};

export default function EditInvoice() {
    const navigate = useNavigate();
    const location = useLocation();
    const invoiceIds = location.state?.invoiceIds || [];

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [rows, setRows] = useState([]);
    const [zoom, setZoom] = useState(100);
    const [selectedCell, setSelectedCell] = useState({ rowId: null, field: 'gstNo' });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [masterReferences, setMasterReferences] = useState({
        vendors: [],
        vendorGsts: [],
        customers: [],
        toStations: [],
        vehicleTypes: [],
        locations: [] // Location Master, from /api/settings/metadata (hierarchy.locations) - same source AddInvoice.jsx Step 1 uses
    });

    // --- FETCH THE SELECTED INVOICES + MASTER REFERENCE DATA ---
    useEffect(() => {
        let isMounted = true;

        const fetchEverything = async () => {
            if (!invoiceIds.length) {
                setLoadError('No invoices were selected to edit.');
                setLoading(false);
                return;
            }

            try {
                const headers = getAuthHeaders();

                // Master reference data — same source AddInvoice.jsx uses.
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
                    console.warn('Could not fetch invoice suggestions API', err);
                }

                // Fetch Vehicle Type Master (mirrors AddInvoice.jsx) - replaces the
                // old hardcoded VEHICLE_TYPES list so both pages stay in sync with
                // the actual master data.
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
                    console.warn('Could not fetch vehicle types', err);
                }

                
                // Fetch the Location Master (task item 1) via the same
                // /api/settings/metadata endpoint AddInvoice.jsx's Step 1
                // hierarchy uses, instead of the Plants master - so the
                // dropdown lists real location codes (N1, N2, R1H4, ...).
                try {
                    const metaRes = await fetch('http://localhost:5000/api/settings/metadata', { method: 'GET', headers });
                    if (isMounted) {
                        const metaJson = metaRes.ok ? await metaRes.json() : {};
                        const metaData = metaJson.data || metaJson || {};
                        setMasterReferences(prev => ({
                            ...prev,
                            locations: metaData.locations || [],
                        }));
                    }
                } catch (err) {
                    console.warn('Could not fetch location master', err);
                }
   // Fetch each selected invoice's full record in parallel.
                const results = await Promise.all(
                    invoiceIds.map(async (id) => {
                        const res = await fetch(`http://localhost:5000/api/invoices/invoices/${id}`, { method: 'GET', headers });
                        if (!res.ok) return null;
                        const json = await res.json();
                        return json.data || null;
                    })
                );

                if (!isMounted) return;

                const fetchedRows = results.filter(Boolean).map(mapInvoiceToRow);
                if (fetchedRows.length === 0) {
                    setLoadError('Could not load the selected invoice(s). They may have been removed.');
                } else {
                    setRows(fetchedRows);
                    setSelectedCell({ rowId: fetchedRows[0].id, field: 'gstNo' });
                }
            } catch (error) {
                console.error('Failed to load invoices for editing', error);
                if (isMounted) setLoadError('Failed to load the selected invoice(s) from the server.');
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchEverything();
        return () => { isMounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- CELL LEVEL CHANGE HANDLING (mirrors AddInvoice.jsx) ---
    const handleCellChange = (id, field, value) => {
        setRows(rows.map(row => {
            if (row.id !== id) return row;

            let updatedRow = { ...row, [field]: value };

            if (field === 'gstNo') updatedRow.gstNo = value.toUpperCase().trim();

            // Picking a new Location (Location Master) keeps the displayed
            // locationName in sync with the LocationID that will actually
            // be submitted.
            if (field === 'locationId') {
                const selectedLocation = masterReferences.locations.find(l => Number(l.LocationID) === Number(value));
                updatedRow.locationName = selectedLocation?.LocationName || '';
            }

            if (field === 'actualWeightMT') {
                let numVal = parseFloat(value) || 0;
                updatedRow.actualWeightMT = numVal > 1000 ? (numVal / 1000).toFixed(2) : value;
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
                vendorGstId: foundRecord ? foundRecord.VendorGSTID : row.vendorGstId,
                vendorId: foundRecord ? foundRecord.VendorID : row.vendorId,
                vendorName: matchedVendor ? matchedVendor.VendorName : row.vendorName
            };
        }));
    };

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

    const handleDeleteRow = (id) => {
        setRows(rows.filter(r => r.id !== id));
    };

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 15, ZOOM_LEVELS[ZOOM_LEVELS.length - 1]));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 15, ZOOM_LEVELS[0]));

    const renderDocCell = (docPath) => {
        if (!docPath) return <Typography variant="caption" sx={{ color: '#9ca3af' }}>No file</Typography>;
        const fileName = docPath.split('\\').pop().split('/').pop();
        const fileUrl = `http://localhost:5000/${docPath.replace(/\\/g, '/')}`;
        return (
            <Box
                component="a"
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#0288d1', fontSize: '0.75rem', textDecoration: 'underline' }}
            >
                <DescriptionIcon fontSize="small" />
                <Typography variant="caption" noWrap sx={{ maxWidth: 90 }}>{fileName}</Typography>
            </Box>
        );
    };

    // Queues a newly picked file for this row - used both by an empty
    // slot's direct file input and by a locked slot's "+ Upload" control.
    // Refuses (with a snackbar) once every empty slot for this row is
    // already spoken for, since an invoice only ever has 3 attachment
    // slots and an existing one can never be replaced.
    const handleQueueUpload = (rowId, file) => {
        if (!file) return;
        let rejected = false;
        setRows(rows.map(row => {
            if (row.id !== rowId) return row;
            const emptySlotCount = getEmptyDocSlots(row).length;
            if (row.pendingUploads.length >= emptySlotCount) {
                rejected = true;
                return row;
            }
            return { ...row, pendingUploads: [...row.pendingUploads, file] };
        }));
        if (rejected) {
            setSnackbar({ open: true, message: 'All attachment slots are already used for this invoice.', severity: 'error' });
        }
    };

    const handleRemovePendingUpload = (rowId, pendingIndex) => {
        setRows(rows.map(row => {
            if (row.id !== rowId) return row;
            return { ...row, pendingUploads: row.pendingUploads.filter((_, i) => i !== pendingIndex) };
        }));
    };

    // Renders one Doc slot cell's contents. A slot with an existing file is
    // locked (view-only link, unchanged) plus a "+ Upload" control for an
    // additional attachment; an empty slot gets a direct file picker. Both
    // paths share the same pendingUploads queue - see handleQueueUpload.
    const renderDocSlotCell = (row, slot) => {
        const existingPath = row[`${slot}Path`];
        const inputId = `doc-upload-${row.id}-${slot}`;

        if (existingPath) {
            const emptySlotCount = getEmptyDocSlots(row).length;
            const atCapacity = row.pendingUploads.length >= emptySlotCount;
            return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {renderDocCell(existingPath)}
                    <Box component="label" htmlFor={inputId} sx={{ display: 'flex', alignItems: 'center', gap: 0.4, cursor: atCapacity ? 'not-allowed' : 'pointer', opacity: atCapacity ? 0.4 : 1 }}>
                        <UploadFileIcon fontSize="inherit" sx={{ fontSize: 14, color: '#107c41' }} />
                        <Typography variant="caption" sx={{ fontSize: '0.68rem', color: '#107c41', fontWeight: 600 }}>+ Upload</Typography>
                    </Box>
                    <input
                        id={inputId}
                        type="file"
                        hidden
                        disabled={atCapacity}
                        onChange={(e) => {
                            handleQueueUpload(row.id, e.target.files?.[0] || null);
                            e.target.value = '';
                        }}
                    />
                </Box>
            );
        }

        // Empty slot: show the file already picked for it (if any), else a
        // direct picker. Its position among this row's empty slots is what
        // ties it to the shared pendingUploads queue, so a file queued via
        // another slot's "+ Upload" can surface here too.
        const emptySlots = getEmptyDocSlots(row);
        const slotPosition = emptySlots.indexOf(slot);
        const pendingFile = row.pendingUploads[slotPosition];

        if (pendingFile) {
            return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" noWrap sx={{ maxWidth: 90, color: '#107c41', fontWeight: 600 }}>{pendingFile.name}</Typography>
                    <IconButton size="small" onClick={() => handleRemovePendingUpload(row.id, slotPosition)} title="Remove this new attachment">
                        <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                </Box>
            );
        }

        return (
            <Box component="label" htmlFor={inputId} sx={{ display: 'flex', alignItems: 'center', gap: 0.4, cursor: 'pointer' }}>
                <UploadFileIcon fontSize="inherit" sx={{ fontSize: 14, color: '#9ca3af' }} />
                <Typography variant="caption" sx={{ fontSize: '0.75rem', color: '#9ca3af' }}>Choose file</Typography>
                <input
                    id={inputId}
                    type="file"
                    hidden
                    onChange={(e) => {
                        handleQueueUpload(row.id, e.target.files?.[0] || null);
                        e.target.value = '';
                    }}
                />
            </Box>
        );
    };

    // Customer Name is only mandatory on a row once that row carries a
    // Detain Charge or Extra Charge - otherwise it stays optional.
    const isCustomerNameMissing = (row) => {
        const detain = parseFloat(row.detainCharge) || 0;
        const extra = parseFloat(row.extraCharge) || 0;
        return (detain > 0 || extra > 0) && !row.customerName?.trim();
    };

    // --- SAVE ALL EDITED ROWS IN ONE BULK REQUEST ---
    const handleSaveChanges = async () => {
               if (rows.length === 0) {
            setSnackbar({ open: true, message: 'There are no rows to save.', severity: 'error' });
            return;
        }

        // Vehicle Type is a mandatory field on every row being saved.
        const missingVehicleTypeRow = rows.find(r => !r.vehicleType || !r.vehicleType.trim());
        if (missingVehicleTypeRow) {
            setSnackbar({ open: true, message: 'Vehicle Type is required for every invoice row.', severity: 'error' });
            return;
        }

        // Customer Name is mandatory only when Detain Chg or Extra Chg is present on that row.
        const missingCustomerNameRow = rows.find(isCustomerNameMissing);
        if (missingCustomerNameRow) {
            setSnackbar({ open: true, message: 'Customer Name is required for any row with a Detain Charge or Extra Charge.', severity: 'error' });
            return;
        }

        setIsSubmitting(true);
        try {
            const payloadRows = rows.map((r) => ({
                invoiceId: r.invoiceId,
                locationId: r.locationId || null,
                gstNo: r.gstNo,
                vendorId: r.vendorId,
                vendorGstId: r.vendorGstId,
                customerName: r.customerName,
                invoiceNo: r.invoiceBillNo,
                invoiceDate: r.invoiceBillDate,
                lrDate: r.lrDate,
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
                preAppr: r.isPreApproved ? 'Yes' : 'No',
            }));

            // FormData (not plain JSON) so any newly queued attachments can
            // ride along with the field changes in one request. Each file
            // is keyed exactly like Add Invoice's own upload (`${slot}_${
            // rowIndex}`), targeting whichever of this row's original
            // Doc1/2/3 slots was empty - never one that's already locked.
            const formData = new FormData();
            formData.append('invoices', JSON.stringify(payloadRows));
            rows.forEach((r, index) => {
                const emptySlots = getEmptyDocSlots(r);
                emptySlots.forEach((slot, position) => {
                    const file = r.pendingUploads[position];
                    if (file) formData.append(`${slot}_${index}`, file);
                });
            });

            const response = await fetch('http://localhost:5000/api/invoices/documents/update', {
                method: 'PUT',
                headers: getAuthHeaders({ json: false }),
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                setSnackbar({ open: true, message: result.message || 'Invoice(s) updated successfully!', severity: 'success' });
                setTimeout(() => navigate('/invoices'), 1200);
            } else {
                setSnackbar({ open: true, message: result.message || 'Failed to update invoice(s).', severity: 'error' });
            }
        } catch (error) {
            console.error('Update submission error:', error);
            setSnackbar({ open: true, message: 'Network or server error while saving changes.', severity: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const rowCountLabel = useMemo(() => (
        rows.length === 1 ? 'Editing 1 invoice' : `Editing ${rows.length} invoices`
    ), [rows.length]);

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1000, mx: 'auto', backgroundColor: '#f0f2f5', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
            {/* Header Title */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <GridOnIcon sx={{ color: '#107c41' }} /> Edit Invoice{rows.length > 1 ? 's' : ''} — Lightning Excel Sheet
                </Typography>
                <Button
                    component={RouterLink}
                    to="/invoices"
                    variant="outlined"
                    startIcon={<ArrowBackIcon />}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                    Back to Invoice List
                </Button>
            </Box>

            {loading ? (
                <Card variant="outlined" sx={{ borderRadius: 3, maxWidth: 500, mx: 'auto' }}>
                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                        <Typography>Loading selected invoice(s)...</Typography>
                    </CardContent>
                </Card>
            ) : loadError ? (
                <Card variant="outlined" sx={{ borderRadius: 3, maxWidth: 500, mx: 'auto' }}>
                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                        <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>
                        <Button component={RouterLink} to="/invoices" variant="contained" startIcon={<ArrowBackIcon />}>
                            Back to Invoice List
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    {/* Toolbar Ribbon */}
                    <Card variant="outlined" sx={{ borderRadius: 2, backgroundColor: '#ffffff', border: '1px solid #d1d5db' }}>
                        <CardContent sx={{ p: '10px 16px !important', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                            <Typography variant="body2" sx={{ color: '#4b5563', fontWeight: 600 }}>
                                {rowCountLabel} — update any field(s) below, then save all changes together.
                            </Typography>
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
                                    maxHeight: 560,
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
                                            <TableCell sx={{ minWidth: 150 }}>Invoice / Bill No *</TableCell>
                                            <TableCell sx={{ minWidth: 130 }}>Invoice Date *</TableCell>
                                            <TableCell sx={{ minWidth: 130 }}>LR Date *</TableCell>
                                            <TableCell sx={{ minWidth: 130 }}>LR NO *</TableCell>
                                            <TableCell sx={{ minWidth: 160 }}>Vehicle Type *</TableCell>
                                            <TableCell sx={{ minWidth: 140 }}>To *</TableCell>
                                            <TableCell sx={{ minWidth: 130, textAlign: 'right' }}>Freight Chargeable Wt (MT/KG)</TableCell>
                                            <TableCell sx={{ minWidth: 120, textAlign: 'right' }}>Freight Chg</TableCell>
                                            <TableCell sx={{ minWidth: 110, textAlign: 'right' }}>Detain Chg</TableCell>
                                            <TableCell sx={{ minWidth: 110, textAlign: 'right' }}>Extra Chg</TableCell>
                                            <TableCell sx={{ minWidth: 200 }}>Customer Name</TableCell>
                                            <TableCell sx={{ minWidth: 120, textAlign: 'right', backgroundColor: '#e6f4ea !important', color: '#137333 !important' }}>Total</TableCell>
                                            <TableCell sx={{ minWidth: 180 }}>Remarks</TableCell>
                                            <TableCell sx={{ minWidth: 90, textAlign: 'center' }}>Pre-Appr</TableCell>
                                            <TableCell sx={{ minWidth: 130 }}>Doc 1</TableCell>
                                            <TableCell sx={{ minWidth: 130 }}>Doc 2</TableCell>
                                            <TableCell sx={{ minWidth: 130 }}>Doc 3</TableCell>
                                            <TableCell sx={{ minWidth: 50, textAlign: 'center' }}>Del</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {rows.map((row, index) => (
                                            <TableRow key={row.id} hover>
                                                <TableCell sx={{ backgroundColor: '#f9fafb', textAlign: 'center', fontWeight: 700, color: '#6b7280', fontSize: '0.75rem', borderRight: '2px solid #cbd5e1' }}>
                                                    {index + 1}
                                                </TableCell>
                                                                                                {/* Location — Location Master dropdown (task item 1). Options are
                                                    this invoice's own Plant/SBU/Company siblings from the hierarchy,
                                                    same source as Add Invoice's Step 1. */}
                                                <TableCell onClick={() => setSelectedCell({ rowId: row.id, field: 'locationId' })}>
                                                    <Select
                                                        value={row.locationId || ''}
                                                        onChange={(e) => handleCellChange(row.id, 'locationId', e.target.value)}
                                                        displayEmpty
                                                        size="small"
                                                        fullWidth
                                                        variant="standard"
                                                        disableUnderline
                                                        sx={{ fontSize: '0.82rem', '& .MuiSelect-select': { py: 0.5, px: 1 } }}
                                                    >
                                                        <MenuItem value="" disabled>-- Select Location --</MenuItem>
                                                        {getLocationOptionsForRow(row, masterReferences.locations).map((l) => (
                                                            <MenuItem key={l.LocationID} value={l.LocationID} sx={{ fontSize: '0.82rem' }}>
                                                                {l.LocationName}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </TableCell>
                                                {/* Vendor Name Autocomplete — selecting a vendor auto-fills GST NO below */}
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

                                                {/* GST NO Autocomplete */}
                                                <TableCell onClick={() => setSelectedCell({ rowId: row.id, field: 'gstNo' })}>
                                                    <EditableAutocompleteCell
                                                        value={row.gstNo}
                                                        options={getVendorGstOptions(row.vendorId)}
                                                        placeholder="Type/Select GST..."
                                                        onChange={(val) => handleGstSelect(row.id, val, row.vendorId)}
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
                                                {/* TO (Destination) Autocomplete */}
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

                                                {/* Customer Name Autocomplete — only mandatory when this row
                                                    carries a Detain Charge or Extra Charge. */}
                                                <TableCell
                                                    onClick={() => setSelectedCell({ rowId: row.id, field: 'customerName' })}
                                                    sx={isCustomerNameMissing(row) ? { outline: '1px solid #d32f2f', outlineOffset: '-1px' } : undefined}
                                                >
                                                    <EditableAutocompleteCell
                                                        value={row.customerName}
                                                        options={masterReferences.customers}
                                                        placeholder="Customer Name..."
                                                        onChange={(val) => handleCellChange(row.id, 'customerName', val)}
                                                    />
                                                    {isCustomerNameMissing(row) && (
                                                        <Typography component="span" sx={{ color: '#d32f2f', fontSize: '0.7rem', pl: 1 }}>
                                                            * required (Detain/Extra Chg present)
                                                        </Typography>
                                                    )}
                                                </TableCell>

                                                <TableCell sx={{ textAlign: 'right', fontWeight: 700, color: '#137333', backgroundColor: '#f4fbf7 !important' }}>
                                                    ₹ {Number(row.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </TableCell>

                                                <TableCell onClick={() => setSelectedCell({ rowId: row.id, field: 'remarks' })}>
                                                    <TextField value={row.remarks} onChange={(e) => handleCellChange(row.id, 'remarks', e.target.value)} placeholder="Remarks" size="small" fullWidth variant="standard" slotProps={{ input: { disableUnderline: true }, htmlInput: { style: { padding: '6px 8px', fontSize: '0.82rem' } } }} />
                                                </TableCell>
                                                <TableCell sx={{ textAlign: 'center' }}>
                                                    <Checkbox checked={row.isPreApproved} onChange={(e) => handleCellChange(row.id, 'isPreApproved', e.target.checked)} size="small" sx={{ color: '#107c41', '&.Mui-checked': { color: '#107c41' } }} />
                                                </TableCell>

                                                <TableCell>{renderDocSlotCell(row, 'doc1')}</TableCell>
                                                <TableCell>{renderDocSlotCell(row, 'doc2')}</TableCell>
                                                <TableCell>{renderDocSlotCell(row, 'doc3')}</TableCell>

                                                <TableCell sx={{ textAlign: 'center' }}>
                                                    <IconButton size="small" color="error" onClick={() => handleDeleteRow(row.id)} title="Remove from this edit batch"><DeleteIcon fontSize="small" /></IconButton>
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
                        <Button component={RouterLink} to="/invoices" variant="outlined" sx={{ textTransform: 'none', px: 3, borderRadius: 2, fontWeight: 600, borderColor: '#d1d5db', color: '#374151' }}>Cancel</Button>
                        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveChanges} disabled={isSubmitting || rows.length === 0} sx={{ textTransform: 'none', px: 4, py: 1.2, fontWeight: 700, borderRadius: 2, backgroundColor: '#107c41', '&:hover': { backgroundColor: '#0b5c31' }, boxShadow: 'none' }}>
                            {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
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
