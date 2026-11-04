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
    Chip
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
    Close as CloseIcon,
    SaveAs as SaveAsIcon,
    Share as ShareIcon
} from '@mui/icons-material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useNavigate, useLocation, useOutletContext, useSearchParams, Link as RouterLink } from 'react-router-dom';
import { parseDateForApi, toDayjsValue, DISPLAY_DATE_FORMAT } from '../../utils/dateFormat';
import { hasAdditionalCharges, isCustomerNameRequired, optionalWeightValue } from '../../utils/invoiceValidation';
import { CONTRACT_TYPES, DEFAULT_CONTRACT_TYPE, getContractTypeLabel, getInvoiceTypeChargesTotal, getInvoiceTypeConfig, isAdHocInvoiceType } from '../../constants/contractTypes';
import { UPLOAD_RULES, findUploadRuleViolation } from '../../constants/uploadRules';
import UploadRequirementsHint from '../../components/common/UploadRequirementsHint';
import useContractDestinations, { getDestinationPlaceholder } from '../../hooks/useContractDestinations';
import { MAX_SO_NUMBER_LENGTH, MIN_FREIGHT_CHARGE, MIN_FREIGHT_CHARGE_MESSAGE, SO_NUMBER_LABEL, isFreightChargeTooLow } from '../../constants/invoiceRules';
import { compressImageFile } from '../../utils/compressImage';
import { serializeEditDraft, restoreEditDraftRows } from '../../utils/invoiceDraft';
import { getInvoiceDraft, saveInvoiceDraft, deleteInvoiceDraft, downloadInvoiceDraftFile } from '../../services/invoiceDraftService';
import { DRAFT_ID_QUERY_PARAM } from '../../constants/invoiceDrafts';
import ShareDraftDialog from '../../components/invoiceForm/ShareDraftDialog';
import { getPartyLabelForContractType, getPartyListKey } from '../../constants/partyTypes';
import { REMARK_MAX_LENGTH, USER_REMARKS_LABEL, SYSTEM_REMARKS_LABEL } from '../../constants/remarks';
import { SERVER_ORIGIN } from '../../constants/appConfig';
import { isVehicleTypeMissing } from '../../utils/invoiceItems';
import { EditableAutocompleteCell, InvoiceField, ReadOnlyFieldText } from '../../components/invoiceForm/InvoiceFormFields';
import { CELL_INPUT_STYLE, FULL_ROW_SX, getInvoiceFieldGridSx } from '../../components/invoiceForm/invoiceFormStyles';

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
// Saved attachments plus files queued on this page both count.
const hasAnyDocument = (row) => getEmptyDocSlots(row).length < DOC_SLOTS.length || row.pendingUploads.length > 0;

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
    soNumber: invoice.SONumber || '',
    vehicleType: invoice.vehicleType?.VehicleName || '',
    vehicleTypeId: invoice.VehicleTypeID || '',
    contractType: invoice.ContractType || DEFAULT_CONTRACT_TYPE,
    // The grid's city is the contract lookup city: the pick-up location for
    // FTL Inbound invoices, the destination for every other type.
    to: (invoice.ContractType === CONTRACT_TYPES.FTL_INBOUND ? invoice.FromStation : invoice.ToStation) || '',
    // Docket / ODA / FOV / loading / other charges of typed invoices are not
    // edited on this page, but stay part of the row total.
    typeChargesTotal: getInvoiceTypeChargesTotal(invoice),
    actualWeightMT: invoice.TotalWeight ?? '',
    freightCharge: invoice.BasicFreight ?? '',
    detainCharge: invoice.DetainCharges ?? '0',
    extraCharge: invoice.ExtraCharges ?? '0',
    total: parseFloat(invoice.TotalInvoiceAmount || 0),
    userRemarks: invoice.UserRemarks || '',
    // System generated (audit outcome) - shown read-only, never sent back.
    systemRemarks: invoice.Remarks || '',
    isPreApproved: Boolean(invoice.IsPreApproved),
    doc1Path: invoice.Doc1Path || null,
    doc2Path: invoice.Doc2Path || null,
    doc3Path: invoice.Doc3Path || null,
    // New attachments queued for this row (not yet saved). Assigned into
    // whichever original Doc1/2/3 slots are empty, in order, at save time.
    pendingUploads: [],
});

// Opening an Edit draft: the draft's values win, but saved attachments
// and system remarks come from the invoice as it is now, and queued
// uploads that no longer fit an empty slot are dropped.
const applyDraftRow = (freshRow, draftRows) => {
    const draftRow = draftRows.find(r => Number(r.invoiceId) === Number(freshRow.invoiceId));
    if (!draftRow) return freshRow;
    const merged = {
        ...freshRow,
        ...draftRow,
        id: freshRow.id,
        doc1Path: freshRow.doc1Path,
        doc2Path: freshRow.doc2Path,
        doc3Path: freshRow.doc3Path,
        systemRemarks: freshRow.systemRemarks,
    };
    return { ...merged, pendingUploads: draftRow.pendingUploads.slice(0, getEmptyDocSlots(merged).length) };
};

const DOC_SLOT_FIELDS = [
    { slot: 'doc1', label: 'Supporting Doc 1' },
    { slot: 'doc2', label: 'Supporting Doc 2' },
    { slot: 'doc3', label: 'Supporting Doc 3' }
];

export default function EditInvoice() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const invoiceIds = location.state?.invoiceIds || [];
    // An Edit draft opened from Saved Drafts or a share mail link.
    const requestedDraftId = location.state?.draftId || searchParams.get(DRAFT_ID_QUERY_PARAM);

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [rows, setRows] = useState([]);
    const [zoom, setZoom] = useState(100);
    // Provided by DashboardLayout's <Outlet context>.
    const { isSidebarCollapsed = false } = useOutletContext() || {};
    const [selectedCell, setSelectedCell] = useState({ rowId: null, field: 'gstNo' });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Highlights missing mandatory fields once the user has tried to save.
    const [showErrors, setShowErrors] = useState(false);
    // Draft of this edit: saving it stores the changes without the audit
    // and without sending anything for approval.
    const [currentDraftId, setCurrentDraftId] = useState(null);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [shareDraftId, setShareDraftId] = useState(null);

    // Destination options of each row come from its vendor's active
    // contract of the row's type, not the whole Destination Master.
    // Ad-Hoc rows have no contract, so nothing is loaded for them.
    const contractTypeForDestinations = (row) => (getInvoiceTypeConfig(row.contractType).usesContract === false ? null : row.contractType);
    const getContractEntry = useContractDestinations(rows.map(r => [r.vendorId, contractTypeForDestinations(r)]));

    // The saved destination stays selectable so an older invoice still shows it.
    const getDestinationOptions = (row) => {
        const destinations = getContractEntry(row.vendorId, row.contractType)?.destinations || [];
        return row.to && !destinations.includes(row.to) ? [row.to, ...destinations] : destinations;
    };

    const [masterReferences, setMasterReferences] = useState({
        vendors: [],
        vendorGsts: [],
        customers: [],
        suppliers: [],
        vehicleTypes: [],
        locations: [] // Location Master, from /api/settings/metadata (hierarchy.locations) - same source AddInvoice.jsx Step 1 uses
    });

    // --- FETCH THE SELECTED INVOICES + MASTER REFERENCE DATA ---
    useEffect(() => {
        let isMounted = true;

        // The invoice ids to open and, for a draft, its saved rows.
        const loadDraftOrSelection = async () => {
            if (!requestedDraftId) return { idsToLoad: invoiceIds, draftRows: null };
            const draft = await getInvoiceDraft(requestedDraftId);
            const draftRows = await restoreEditDraftRows({
                rows: draft.page?.rows,
                fileIndex: draft.files,
                downloadFile: (fileKey) => downloadInvoiceDraftFile(requestedDraftId, fileKey)
            });
            if (isMounted) setCurrentDraftId(Number(requestedDraftId));
            return { idsToLoad: draft.page?.invoiceIds || [], draftRows };
        };

        const fetchEverything = async () => {
            let selection;
            try {
                selection = await loadDraftOrSelection();
            } catch (error) {
                if (isMounted) {
                    setLoadError(error?.response?.data?.message || 'Could not open the saved draft.');
                    setLoading(false);
                }
                return;
            }
            const { idsToLoad, draftRows } = selection;
            if (!idsToLoad.length) {
                setLoadError('No invoices were selected to edit.');
                setLoading(false);
                return;
            }

            try {
                const headers = getAuthHeaders();

                // Master reference data — same source AddInvoice.jsx uses.
                try {
                    const suggestionRes = await fetch(`${SERVER_ORIGIN}/api/invoices/invoice-suggestions`, { method: 'GET', headers });
                    if (suggestionRes.ok && isMounted) {
                        const sJson = await suggestionRes.json();
                        const sData = sJson.data || {};
                        setMasterReferences(prev => ({
                            ...prev,
                            vendors: sData.vendors || [],
                            vendorGsts: sData.vendorGsts || [],
                            customers: sData.customers || [],
                            suppliers: sData.suppliers || []
                        }));
                    }
                } catch (err) {
                    console.warn('Could not fetch invoice suggestions API', err);
                }

                // Fetch Vehicle Type Master (mirrors AddInvoice.jsx) - replaces the
                // old hardcoded VEHICLE_TYPES list so both pages stay in sync with
                // the actual master data.
                try {
                    const vehicleTypesRes = await fetch(`${SERVER_ORIGIN}/api/masters/vehicle-types?pageSize=1000`, { headers });
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
                    // Only the locations this user may edit invoices of.
                    const metaRes = await fetch(`${SERVER_ORIGIN}/api/settings/metadata?access=edit`, { method: 'GET', headers });
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
                    idsToLoad.map(async (id) => {
                        const res = await fetch(`${SERVER_ORIGIN}/api/invoices/invoices/${id}`, { method: 'GET', headers });
                        if (!res.ok) return null;
                        const json = await res.json();
                        return json.data || null;
                    })
                );

                if (!isMounted) return;

                const fetchedRows = results.filter(Boolean).map(mapInvoiceToRow).map(row => (draftRows ? applyDraftRow(row, draftRows) : row));
                if (fetchedRows.length === 0) {
                    setLoadError('Could not load the selected invoice(s). They may have been removed.');
                } else {
                    setRows(fetchedRows);
                    setSelectedCell({ rowId: fetchedRows[0].id, field: 'gstNo' });
                    if (fetchedRows.length < idsToLoad.length) {
                        setSnackbar({ open: true, message: `${idsToLoad.length - fetchedRows.length} invoice(s) could not be opened - they were removed or are outside your locations.`, severity: 'warning' });
                    }
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

            if (field === 'actualWeightMT' && !getInvoiceTypeConfig(row.contractType).weightInKg) {
                let numVal = parseFloat(value) || 0;
                updatedRow.actualWeightMT = numVal > 1000 ? (numVal / 1000).toFixed(2) : value;
            }

            if (['freightCharge', 'detainCharge', 'extraCharge'].includes(field)) {
                const freight = parseFloat(updatedRow.freightCharge) || 0;
                const detain = parseFloat(updatedRow.detainCharge) || 0;
                const extra = parseFloat(updatedRow.extraCharge) || 0;
                updatedRow.total = freight + detain + extra + row.typeChargesTotal;
            }

            return updatedRow;
        }));
    };

    const handleGstSelect = (id, gstValue) => {
        const cleanGst = (gstValue || '').toUpperCase().trim();
        const foundRecord = masterReferences.vendorGsts.find(v => (v.GSTNumber || '').toUpperCase() === cleanGst);
        const matchedVendor = foundRecord
            ? masterReferences.vendors.find(v => Number(v.VendorID) === Number(foundRecord.VendorID))
            : null;

        setRows(rows.map(row => {
            if (row.id !== id) return row;
            const nextVendorId = foundRecord ? foundRecord.VendorID : row.vendorId;
            return {
                ...row,
                gstNo: cleanGst,
                vendorGstId: foundRecord ? foundRecord.VendorGSTID : row.vendorGstId,
                vendorId: nextVendorId,
                vendorName: matchedVendor ? matchedVendor.VendorName : row.vendorName,
                to: Number(nextVendorId) === Number(row.vendorId) ? row.to : ''
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
                gstNo: defaultGst ? (defaultGst.GSTNumber || '').toUpperCase().trim() : row.gstNo,
                vendorGstId: defaultGst ? defaultGst.VendorGSTID : row.vendorGstId,
                // A destination of the previous vendor's contract is not valid for the new vendor.
                to: Number(vendorId) === Number(row.vendorId) ? row.to : ''
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
        const fileUrl = `${SERVER_ORIGIN}/${docPath.replace(/\\/g, '/')}`;
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
    const handleQueueUpload = async (rowId, pickedFile) => {
        if (!pickedFile) return;
        // Large photos are compressed before they are checked and queued.
        const file = await compressImageFile(pickedFile);
        const violation = findUploadRuleViolation(file, UPLOAD_RULES.INVOICE_DOCUMENT);
        if (violation) {
            setSnackbar({ open: true, message: violation, severity: 'error' });
            return;
        }
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
                        accept={UPLOAD_RULES.INVOICE_DOCUMENT.accept}
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
                    accept={UPLOAD_RULES.INVOICE_DOCUMENT.accept}
                    onChange={(e) => {
                        handleQueueUpload(row.id, e.target.files?.[0] || null);
                        e.target.value = '';
                    }}
                />
            </Box>
        );
    };

    // --- SAVE ALL EDITED ROWS IN ONE BULK REQUEST ---
    const handleSaveChanges = async () => {
               if (rows.length === 0) {
            setSnackbar({ open: true, message: 'There are no rows to save.', severity: 'error' });
            return;
        }

        setShowErrors(true);
        // Vehicle Type is mandatory for every type whose rate depends on it.
        // Per-KG contract types (PTL / Part Load) are billed without a vehicle type.
        const missingVehicleTypeRow = rows.find(r => isVehicleTypeMissing(r, getInvoiceTypeConfig(r.contractType)));
        if (missingVehicleTypeRow) {
            setSnackbar({ open: true, message: `Vehicle Type is required. Check invoice '${missingVehicleTypeRow.invoiceBillNo || ''}'.`, severity: 'error' });
            return;
        }

        // Ad-Hoc invoices have no contract and pre-approved ones skip the
        // audit, so both need at least one supporting document.
        const rowWithoutRequiredDocument = rows.find(r => (r.isPreApproved || isAdHocInvoiceType(r.contractType)) && !hasAnyDocument(r));
        if (rowWithoutRequiredDocument) {
            const reason = isAdHocInvoiceType(rowWithoutRequiredDocument.contractType) ? 'Ad-Hoc' : 'Pre-Approved';
            setSnackbar({ open: true, message: `${reason} invoice '${rowWithoutRequiredDocument.invoiceBillNo || ''}' needs at least one supporting document.`, severity: 'error' });
            return;
        }

        const lowFreightRow = rows.find(r => isFreightChargeTooLow(r.freightCharge));
        if (lowFreightRow) {
            setSnackbar({ open: true, message: `${MIN_FREIGHT_CHARGE_MESSAGE} Check invoice '${lowFreightRow.invoiceBillNo || ''}'.`, severity: 'error' });
            return;
        }

        const missingPartyRow = rows.find(isCustomerNameRequired);
        if (missingPartyRow) {
            setSnackbar({
                open: true,
                message: `${getPartyLabelForContractType(missingPartyRow.contractType)} Name is required when Detain Charge or Extra Charge is entered.`,
                severity: 'error',
            });
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
                soNumber: String(r.soNumber || '').trim(),
                vehicleType: r.vehicleType,
                vehicleTypeId: r.vehicleTypeId || null,
                toStation: r.to,
                actualWeight: optionalWeightValue(r.actualWeightMT),
                freightCharge: parseFloat(r.freightCharge) || 0,
                detainCharge: parseFloat(r.detainCharge) || 0,
                extraCharge: parseFloat(r.extraCharge) || 0,
                total: r.total,
                userRemarks: r.userRemarks,
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

            const response = await fetch(`${SERVER_ORIGIN}/api/invoices/documents/update`, {
                method: 'PUT',
                headers: getAuthHeaders({ json: false }),
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                // The changes are saved, so the draft they came from is done.
                if (currentDraftId) await deleteInvoiceDraft(currentDraftId).catch(() => null);
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

    // Stores the edited rows (and queued uploads) as a draft; returns its
    // id, or null when saving failed.
    const saveEditDraft = async () => {
        setIsSavingDraft(true);
        try {
            const { draft, files } = serializeEditDraft(rows);
            const saved = await saveInvoiceDraft({ draftId: currentDraftId, draft, files });
            const savedDraftId = saved?.DraftID || currentDraftId;
            setCurrentDraftId(savedDraftId);
            return savedDraftId;
        } catch (error) {
            setSnackbar({ open: true, message: error?.response?.data?.message || 'Failed to save the draft.', severity: 'error' });
            return null;
        } finally {
            setIsSavingDraft(false);
        }
    };

    const handleSaveDraft = async () => {
        if (await saveEditDraft()) {
            setSnackbar({ open: true, message: 'Draft saved - nothing was audited or sent for approval. Resume it from Saved Drafts on the Invoice List.', severity: 'success' });
        }
    };

    // Saves the draft, then asks who to share it with.
    const handleSaveAndShareDraft = async () => {
        const savedDraftId = await saveEditDraft();
        if (savedDraftId) setShareDraftId(savedDraftId);
    };

    const handleDraftShared = (message) => {
        setShareDraftId(null);
        setSnackbar({ open: true, message, severity: 'success' });
    };

    const rowCountLabel = useMemo(() => (
        rows.length === 1 ? 'Editing 1 invoice' : `Editing ${rows.length} invoices`
    ), [rows.length]);

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Box sx={{ p: { xs: 1.5, md: 2 }, backgroundColor: '#f0f2f5', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
            {/* Header Title */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1.5 }}>
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
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {/* Toolbar Ribbon */}
                    <Card variant="outlined" sx={{ borderRadius: 2, backgroundColor: '#ffffff', border: '1px solid #d1d5db' }}>
                        <CardContent sx={{ p: '6px 16px !important', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                <Typography variant="body2" sx={{ color: '#4b5563', fontWeight: 600 }}>
                                    {rowCountLabel} — update any field(s) below, then save all changes together. Save Draft keeps your changes without sending them for approval.
                                </Typography>
                                {currentDraftId && <Chip size="small" color="warning" variant="outlined" label="Editing a saved draft" />}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#f3f4f6', p: '2px 8px', borderRadius: 1.5, border: '1px solid #e5e7eb' }}>
                                <IconButton size="small" onClick={handleZoomOut} disabled={zoom <= ZOOM_LEVELS[0]}><ZoomOutIcon fontSize="small" /></IconButton>
                                <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 35, textAlign: 'center' }}>{zoom}%</Typography>
                                <IconButton size="small" onClick={handleZoomIn} disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}><ZoomInIcon fontSize="small" /></IconButton>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Invoice cards - one card per invoice, no horizontal scrolling */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, zoom: zoom / 100 }}>
                        {rows.map((row, index) => {
                            const activate = (field) => () => setSelectedCell({ rowId: row.id, field });
                            const rowTypeConfig = getInvoiceTypeConfig(row.contractType);
                            const partyLabel = getPartyLabelForContractType(row.contractType);

                            return (
                                <Card key={row.id} variant="outlined" sx={{ borderRadius: 2, backgroundColor: '#ffffff', border: selectedCell.rowId === row.id ? '1px solid #107c41' : '1px solid #d1d5db' }}>
                                    {/* Card header: invoice number, contract type, total, pre-approval, remove */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, px: 1.5, py: 0.25, backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', borderRadius: '8px 8px 0 0' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#111827' }}>Invoice #{index + 1}</Typography>
                                            <Chip size="small" color="success" variant="outlined" label={getContractTypeLabel(row.contractType)} />
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <Checkbox checked={row.isPreApproved} onChange={(e) => handleCellChange(row.id, 'isPreApproved', e.target.checked)} size="small" sx={{ color: '#107c41', '&.Mui-checked': { color: '#107c41' } }} />
                                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151' }}>Pre-Approved</Typography>
                                            </Box>
                                            <Chip label={`Total ₹ ${Number(row.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} sx={{ fontWeight: 800, color: '#137333', backgroundColor: '#e6f4ea' }} />
                                            <IconButton size="small" color="error" onClick={() => handleDeleteRow(row.id)} title="Remove from this edit batch"><DeleteIcon fontSize="small" /></IconButton>
                                        </Box>
                                    </Box>

                                    <CardContent sx={{ ...getInvoiceFieldGridSx(isSidebarCollapsed), p: '8px 12px !important' }}>
                                        {/* <InvoiceSectionTitle>Vendor & Invoice</InvoiceSectionTitle> */}

                                        {/* Location - this invoice's own Plant/SBU/Company siblings */}
                                        <InvoiceField label="Location" onActivate={activate('locationId')}>
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
                                                    <MenuItem key={l.LocationID} value={l.LocationID} sx={{ fontSize: '0.82rem' }}>{l.LocationName}</MenuItem>
                                                ))}
                                            </Select>
                                        </InvoiceField>

                                        {/* Vendor Name - selecting a vendor auto-fills GST NO */}
                                        <InvoiceField label="Vendor Name *" onActivate={activate('vendorName')}>
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
                                                        inputProps={{ ...params.inputProps, style: CELL_INPUT_STYLE }}
                                                    />
                                                )}
                                            />
                                        </InvoiceField>

                                        <InvoiceField label="GST NO * (VendorGST Master)" onActivate={activate('gstNo')}>
                                            <EditableAutocompleteCell
                                                value={row.gstNo}
                                                options={masterReferences.vendorGsts.map(v => v.GSTNumber).filter(Boolean)}
                                                placeholder="Type/Select GST..."
                                                onChange={(val) => handleGstSelect(row.id, val)}
                                            />
                                        </InvoiceField>

                                        <InvoiceField label="Invoice / Bill No *" onActivate={activate('invoiceBillNo')}>
                                            <TextField value={row.invoiceBillNo} onChange={(e) => handleCellChange(row.id, 'invoiceBillNo', e.target.value)} placeholder="INV-001" size="small" fullWidth variant="standard" slotProps={{ input: { disableUnderline: true }, htmlInput: { style: CELL_INPUT_STYLE } }} />
                                        </InvoiceField>
                                        <InvoiceField label="Invoice Date *" onActivate={activate('invoiceBillDate')}>
                                            <DatePicker
                                                value={toDayjsValue(row.invoiceBillDate)}
                                                onChange={(newValue) => handleCellChange(row.id, 'invoiceBillDate', parseDateForApi(newValue))}
                                                format={DISPLAY_DATE_FORMAT}
                                                slotProps={{ textField: { size: 'small', fullWidth: true, variant: 'standard', slotProps: { input: { disableUnderline: true }, inputLabel: { shrink: true }, htmlInput: { style: CELL_INPUT_STYLE } } } }}
                                            />
                                        </InvoiceField>
                                        <InvoiceField label="LR Date *" onActivate={activate('lrDate')}>
                                            <DatePicker
                                                value={toDayjsValue(row.lrDate)}
                                                onChange={(newValue) => handleCellChange(row.id, 'lrDate', parseDateForApi(newValue))}
                                                format={DISPLAY_DATE_FORMAT}
                                                slotProps={{ textField: { size: 'small', fullWidth: true, variant: 'standard', slotProps: { input: { disableUnderline: true }, inputLabel: { shrink: true }, htmlInput: { style: CELL_INPUT_STYLE } } } }}
                                            />
                                        </InvoiceField>
                                        <InvoiceField label="LR NO *" onActivate={activate('lrNo')}>
                                            <TextField value={row.lrNo} onChange={(e) => handleCellChange(row.id, 'lrNo', e.target.value)} placeholder="LR No" size="small" fullWidth variant="standard" slotProps={{ input: { disableUnderline: true }, htmlInput: { style: CELL_INPUT_STYLE } }} />
                                        </InvoiceField>
                                        <InvoiceField label={SO_NUMBER_LABEL} onActivate={activate('soNumber')}>
                                            <TextField value={row.soNumber} onChange={(e) => handleCellChange(row.id, 'soNumber', e.target.value)} placeholder="SO No (optional)" size="small" fullWidth variant="standard" slotProps={{ input: { disableUnderline: true }, htmlInput: { style: CELL_INPUT_STYLE, maxLength: MAX_SO_NUMBER_LENGTH } }} />
                                        </InvoiceField>

                                        {/* <InvoiceSectionTitle>Shipment & Charges</InvoiceSectionTitle> */}

                                        {rowTypeConfig.showVehicleType && (
                                            <InvoiceField label={rowTypeConfig.vehicleTypeRequired === false ? 'Vehicle Type' : 'Vehicle Type *'} onActivate={activate('vehicleType')} error={showErrors && isVehicleTypeMissing(row, rowTypeConfig)}>
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
                                                    <MenuItem value="" disabled={rowTypeConfig.vehicleTypeRequired !== false}>-- Select Vehicle Type --</MenuItem>
                                                    {masterReferences.vehicleTypes.map((t, idx) => (
                                                        <MenuItem key={idx} value={t} sx={{ fontSize: '0.82rem' }}>{t}</MenuItem>
                                                    ))}
                                                </Select>
                                            </InvoiceField>
                                        )}

                                        {/* City - destination, or the pick-up location for FTL Inbound */}
                                        <InvoiceField label={rowTypeConfig.cityLabel} onActivate={activate('to')}>
                                            <EditableAutocompleteCell
                                                value={row.to}
                                                options={getDestinationOptions(row)}
                                                placeholder={rowTypeConfig.usesContract === false ? 'Type destination city' : getDestinationPlaceholder(getContractEntry(row.vendorId, row.contractType), rowTypeConfig.cityLabel.replace(' *', ''))}
                                                onChange={(val) => handleCellChange(row.id, 'to', val)}
                                                freeSolo={!rowTypeConfig.citySelectOnly}
                                            />
                                        </InvoiceField>

                                        <InvoiceField label={rowTypeConfig.weightLabel} onActivate={activate('actualWeightMT')}>
                                            <TextField type="number" value={row.actualWeightMT} onChange={(e) => handleCellChange(row.id, 'actualWeightMT', e.target.value)} placeholder={rowTypeConfig.weightInKg ? '0 KG' : '0.00 MT'} size="small" fullWidth variant="standard" slotProps={{ input: { disableUnderline: true }, htmlInput: { style: CELL_INPUT_STYLE } }} />
                                        </InvoiceField>
                                        <InvoiceField label="Basic Freight Chg" onActivate={activate('freightCharge')}>
                                            <TextField type="number" value={row.freightCharge} onChange={(e) => handleCellChange(row.id, 'freightCharge', e.target.value)} placeholder={`Min ${MIN_FREIGHT_CHARGE}`} size="small" fullWidth variant="standard" error={row.freightCharge !== '' && isFreightChargeTooLow(row.freightCharge)} title={MIN_FREIGHT_CHARGE_MESSAGE} slotProps={{ input: { disableUnderline: true, sx: row.freightCharge !== '' && isFreightChargeTooLow(row.freightCharge) ? { color: 'error.main' } : undefined }, htmlInput: { style: CELL_INPUT_STYLE, min: MIN_FREIGHT_CHARGE } }} />
                                        </InvoiceField>
                                        <InvoiceField label="Detain Chg" onActivate={activate('detainCharge')}>
                                            <TextField type="number" value={row.detainCharge} onChange={(e) => handleCellChange(row.id, 'detainCharge', e.target.value)} placeholder="0" size="small" fullWidth variant="standard" slotProps={{ input: { disableUnderline: true }, htmlInput: { style: CELL_INPUT_STYLE } }} />
                                        </InvoiceField>
                                        <InvoiceField label="Extra Chg" onActivate={activate('extraCharge')}>
                                            <TextField type="number" value={row.extraCharge} onChange={(e) => handleCellChange(row.id, 'extraCharge', e.target.value)} placeholder="0" size="small" fullWidth variant="standard" slotProps={{ input: { disableUnderline: true }, htmlInput: { style: CELL_INPUT_STYLE } }} />
                                        </InvoiceField>

                                        {/* <InvoiceSectionTitle>Customer, Remarks & Documents</InvoiceSectionTitle> */}

                                        {/* Supplier on inbound invoices, customer on outbound */}
                                        <InvoiceField label={hasAdditionalCharges(row) ? `${partyLabel} Name *` : `${partyLabel} Name (required if charges)`} onActivate={activate('customerName')}>
                                            <EditableAutocompleteCell
                                                value={row.customerName}
                                                options={masterReferences[getPartyListKey(row.contractType)]}
                                                placeholder={hasAdditionalCharges(row) ? `${partyLabel} Name (required)` : `${partyLabel} Name (optional)`}
                                                required={hasAdditionalCharges(row)}
                                                onChange={(val) => handleCellChange(row.id, 'customerName', val)}
                                            />
                                        </InvoiceField>
                                        <Box sx={{ gridColumn: { md: 'span 2' }, minWidth: 0 }}>
                                            <InvoiceField label={USER_REMARKS_LABEL} onActivate={activate('userRemarks')}>
                                                <TextField value={row.userRemarks} onChange={(e) => handleCellChange(row.id, 'userRemarks', e.target.value)} placeholder="Your remarks (optional)" size="small" fullWidth variant="standard" slotProps={{ input: { disableUnderline: true }, htmlInput: { style: CELL_INPUT_STYLE, maxLength: REMARK_MAX_LENGTH } }} />
                                            </InvoiceField>
                                        </Box>
                                        <Box sx={FULL_ROW_SX}>
                                            <InvoiceField label={`${SYSTEM_REMARKS_LABEL} (not editable)`}>
                                                <ReadOnlyFieldText>{row.systemRemarks}</ReadOnlyFieldText>
                                            </InvoiceField>
                                        </Box>

                                        {DOC_SLOT_FIELDS.map(({ slot, label }) => (
                                            <InvoiceField key={slot} label={label} onActivate={activate(slot)} hint={<UploadRequirementsHint rule={UPLOAD_RULES.INVOICE_DOCUMENT} sx={{ mt: 0.25 }} />}>
                                                <Box sx={{ px: 0.5, py: 0.5 }}>{renderDocSlotCell(row, slot)}</Box>
                                            </InvoiceField>
                                        ))}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </Box>

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, flexWrap: 'wrap' }}>
                        <Button component={RouterLink} to="/invoices" variant="outlined" sx={{ textTransform: 'none', px: 3, borderRadius: 2, fontWeight: 600, borderColor: '#d1d5db', color: '#374151' }}>Cancel</Button>
                        <Button variant="outlined" startIcon={<SaveAsIcon />} onClick={handleSaveDraft} disabled={isSavingDraft || isSubmitting || rows.length === 0} sx={{ textTransform: 'none', px: 3, borderRadius: 2, fontWeight: 600, borderColor: '#107c41', color: '#107c41' }}>
                            {isSavingDraft ? 'Saving Draft...' : 'Save Draft'}
                        </Button>
                        <Button variant="outlined" startIcon={<ShareIcon />} onClick={handleSaveAndShareDraft} disabled={isSavingDraft || isSubmitting || rows.length === 0} sx={{ textTransform: 'none', px: 3, borderRadius: 2, fontWeight: 600, borderColor: '#2563eb', color: '#2563eb' }}>
                            Save &amp; Share
                        </Button>
                        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveChanges} disabled={isSubmitting || isSavingDraft || rows.length === 0} sx={{ textTransform: 'none', px: 4, py: 1.2, fontWeight: 700, borderRadius: 2, backgroundColor: '#107c41', '&:hover': { backgroundColor: '#0b5c31' }, boxShadow: 'none' }}>
                            {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                        </Button>
                    </Box>
                </Box>
            )}

            <ShareDraftDialog
                open={Boolean(shareDraftId)}
                draftId={shareDraftId}
                onClose={() => setShareDraftId(null)}
                onShared={handleDraftShared}
            />

            {/* Notification Snackbar */}
            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
        </LocalizationProvider>
    );
}
