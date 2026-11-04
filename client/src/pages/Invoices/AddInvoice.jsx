import React, { useState, useMemo, useEffect } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Button,
    TextField,
    Autocomplete,
    Checkbox,
    IconButton,
    Alert,
    Snackbar,
    Divider,
    Chip
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
    Save as SaveIcon,
    SaveAs as SaveAsIcon,
    Share as ShareIcon,
    PlaylistAdd as AddTripIcon
} from '@mui/icons-material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { parseDateForApi, toDayjsValue, DISPLAY_DATE_FORMAT } from '../../utils/dateFormat';
import ContractTypePicker from '../../components/common/ContractTypePicker';
import DeleteDialog from '../../components/common/DeleteDialog';
import { INVOICE_TYPE_OPTIONS, getContractTypeLabel, getInvoiceTypeConfig, isAdHocInvoiceType } from '../../constants/contractTypes';
import { UPLOAD_RULES, findTotalSizeViolation, findUploadRuleViolation } from '../../constants/uploadRules';
import { compressImageFile } from '../../utils/compressImage';
import { DRAFT_ID_QUERY_PARAM, DRAFT_PAGE_PATHS, DRAFT_TYPES } from '../../constants/invoiceDrafts';
import useInvoiceDrafts from '../../hooks/useInvoiceDrafts';
import UploadRequirementsHint from '../../components/common/UploadRequirementsHint';
import { getSelectableApprovers } from '../../services/approvalWorkflowService';
import { getPartyLabelForContractType, getPartyListKey, getPartyTypeForContractType } from '../../constants/partyTypes';
import { REMARK_MAX_LENGTH, USER_REMARKS_LABEL } from '../../constants/remarks';
import {
    MAX_INVOICES,
    MAX_ITEMS_PER_INVOICE,
    ZOOM_LEVELS,
    DOCUMENT_FIELDS,
    UPLOAD_TIMEOUT_MS
} from '../../constants/addInvoice';
import useContractDestinations, { getDestinationPlaceholder, isOutsideContract } from '../../hooks/useContractDestinations';
import {
    applyItemChange,
    buildPayloadRows,
    createEmptyInvoice,
    createEmptyItem,
    findInvoiceValidationError,
    getInvoiceTotal,
    hasSupportingDocument,
    isInvoiceBlank,
    isInvoiceFilled,
    isSupportingDocumentRequired
} from '../../utils/invoiceItems';
import { serializeDraft, restoreDraftInvoices } from '../../utils/invoiceDraft';
import {
    getInvoiceDraft,
    saveInvoiceDraft,
    downloadInvoiceDraftFile
} from '../../services/invoiceDraftService';
import { EditableAutocompleteCell, InvoiceField, InvoiceSectionTitle } from '../../components/invoiceForm/InvoiceFormFields';
import { CELL_INPUT_STYLE, FULL_ROW_SX, getInvoiceFieldGridSx } from '../../components/invoiceForm/invoiceFormStyles';
import InvoiceTripItem from '../../components/invoiceForm/InvoiceTripItem';
import RemoveInvoiceDialog from '../../components/invoiceForm/RemoveInvoiceDialog';
import InvoiceDraftsPanel from '../../components/invoiceForm/InvoiceDraftsPanel';
import ShareDraftDialog from '../../components/invoiceForm/ShareDraftDialog';

const ZOOM_STEP = 15;
const PRIMARY_BUTTON_SX = { textTransform: 'none', fontWeight: 700, backgroundColor: '#107c41', '&:hover': { backgroundColor: '#0b5c31' }, boxShadow: 'none' };
const TEXT_SLOT_PROPS = { input: { disableUnderline: true }, htmlInput: { style: CELL_INPUT_STYLE } };

// Used when the hierarchy metadata API is unreachable (same as before).
const FALLBACK_HIERARCHY = {
    companies: [{ CompanyID: 1, CompanyName: 'Rubamin' }],
    sbus: [{ SBUID: 1, CompanyID: 1, SBUName: 'Zinc' }],
    plants: [{ PlantHierarchyID: 1, SBUID: 1, PlantName: 'Halol' }],
    locations: [{ LocationID: 1, PlantHierarchyID: 1, LocationName: 'R1H4' }]
};

const apiErrorMessage = (error, fallback) => error?.response?.data?.message || fallback;

const approverLabel = (user) => (user?.RoleName ? `${user.FullName} (${user.RoleName})` : user?.FullName || '');

const sameId = (a, b) => a !== null && a !== undefined && Number(a) === Number(b);

const findById = (list, idField, id) => list.find((entry) => sameId(entry[idField], id)) || null;

// Re-normalizes a stored date right before it is sent, so the API only
// ever receives YYYY-MM-DD or null (never a string SQL Server can't parse).
const normalizeDateForApi = (value, fallbackToToday = false) => {
    const normalized = parseDateForApi(toDayjsValue(value));
    if (normalized) return normalized;
    return fallbackToToday ? new Date().toISOString().split('T')[0] : null;
};

export default function AddInvoice() {
    // --- STATE MANAGEMENT ---
    const [step, setStep] = useState(1);
    // Asked before anything else - decides the fields and the audit.
    const [contractType, setContractType] = useState('');
    const typeConfig = getInvoiceTypeConfig(contractType);
    // Inbound invoices pick a supplier, outbound invoices a customer.
    const partyLabel = getPartyLabelForContractType(contractType);
    // Provided by DashboardLayout's <Outlet context>.
    const { isSidebarCollapsed = false } = useOutletContext() || {};

    // Hierarchy Master Data
    const [hierarchy, setHierarchy] = useState({ companies: [], sbus: [], plants: [], locations: [] });
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [selectedSbu, setSelectedSbu] = useState(null);
    const [selectedPlant, setSelectedPlant] = useState(null);
    const [selectedLocation, setSelectedLocation] = useState(null);

    const [masterReferences, setMasterReferences] = useState({
        vendors: [],    // [{ VendorID, VendorName }] - active vendors only
        vendorGsts: [], // [{ VendorGSTID, GSTNumber, VendorID, IsDefault }]
        customers: [],  // Customer / Supplier Master, type Customer
        suppliers: [],  // Customer / Supplier Master, type Supplier
        vehicleTypes: [] // Vehicle Type Master names
    });
    const partyOptions = masterReferences[getPartyListKey(contractType)];

    // Invoice cards
    const [zoom, setZoom] = useState(100);
    const [invoices, setInvoices] = useState([createEmptyInvoice()]);
    const [activeField, setActiveField] = useState('Invoice 1 : VENDOR');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Highlights missing mandatory fields once the user has tried to save.
    const [showErrors, setShowErrors] = useState(false);

    // Drafts - own ones and the ones shared with this user
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { drafts, reloadDrafts, deleteDraft } = useInvoiceDrafts();
    // A draft opened from the Invoice List or a share mail link.
    const requestedDraftId = location.state?.draftId || searchParams.get(DRAFT_ID_QUERY_PARAM);
    const [requestedDraftHandled, setRequestedDraftHandled] = useState(false);
    const [masterDataLoaded, setMasterDataLoaded] = useState(false);
    const [shareDraftId, setShareDraftId] = useState(null);
    const [currentDraftId, setCurrentDraftId] = useState(null);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [busyDraftId, setBusyDraftId] = useState(null);
    const [draftIdToDelete, setDraftIdToDelete] = useState(null);
    const [invoiceIdToRemove, setInvoiceIdToRemove] = useState(null);

    // Approver step of the selected location the uploader picks for (e.g.
    // HOD); null when the location's workflow has no such step.
    const [approverStep, setApproverStep] = useState(null);
    const defaultApproverId = approverStep?.users.length === 1 ? approverStep.users[0].UserID : null;

    // Destination options of each invoice come from its vendor's active
    // contract of the chosen type, not the whole Destination Master.
    // Ad-Hoc invoices have no contract, so nothing is loaded for them.
    const contractTypeForDestinations = typeConfig.usesContract === false ? null : contractType;
    const getContractEntry = useContractDestinations(invoices.map(inv => [inv.vendorId, contractTypeForDestinations]));

    const notify = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

    // --- INITIAL FETCH OF MASTER DATA AND DRAFTS ---
    useEffect(() => {
        let isMounted = true;
        const loadMasterData = async () => {
            const [metadata, suggestions, vehicleTypes] = await Promise.allSettled([
                // Only the locations this user may add invoices for.
                api.get('/settings/metadata', { params: { access: 'add' } }),
                api.get('/invoices/invoice-suggestions'),
                api.get('/masters/vehicle-types', { params: { pageSize: 1000 } })
            ]);
            if (!isMounted) return;

            const metaData = metadata.status === 'fulfilled' ? (metadata.value.data?.data || metadata.value.data) : null;
            setHierarchy(metaData ? {
                companies: metaData.companies || [],
                sbus: metaData.sbus || [],
                plants: metaData.plants || [],
                locations: metaData.locations || []
            } : FALLBACK_HIERARCHY);

            const suggestionData = suggestions.status === 'fulfilled' ? suggestions.value.data?.data || {} : {};
            const vehicleTypeRows = vehicleTypes.status === 'fulfilled' ? vehicleTypes.value.data?.data || [] : [];
            setMasterReferences({
                vendors: suggestionData.vendors || [],
                vendorGsts: suggestionData.vendorGsts || [],
                customers: suggestionData.customers || [],
                suppliers: suggestionData.suppliers || [],
                vehicleTypes: vehicleTypeRows.map(v => v.VehicleName).filter(Boolean)
            });
            setMasterDataLoaded(true);
        };

        loadMasterData();
        return () => {
            isMounted = false;
        };
    }, []);

    // Approvers of the selected location; a single approver is pre-filled.
    useEffect(() => {
        let isMounted = true;
        const locationId = selectedLocation?.LocationID;
        if (!locationId) {
            setApproverStep(null);
            return undefined;
        }
        getSelectableApprovers(locationId)
            .then((step) => {
                if (!isMounted) return;
                setApproverStep(step);
                const onlyApproverId = step?.users.length === 1 ? step.users[0].UserID : null;
                const validIds = new Set((step?.users || []).map(user => Number(user.UserID)));
                setInvoices(prev => prev.map(inv => ({
                    ...inv,
                    approverUserId: validIds.has(Number(inv.approverUserId)) ? inv.approverUserId : onlyApproverId
                })));
            })
            .catch((error) => {
                console.warn('Could not load the approvers of this location', error);
                if (isMounted) setApproverStep(null);
            });
        return () => {
            isMounted = false;
        };
    }, [selectedLocation]);

    // --- CASCADING HIERARCHY COMPUTED OPTIONS ---
    const availableSbus = useMemo(() => {
        if (!selectedCompany) return [];
        return hierarchy.sbus.filter(s => sameId(s.CompanyID, selectedCompany.CompanyID));
    }, [selectedCompany, hierarchy.sbus]);

    const availablePlants = useMemo(() => {
        if (!selectedSbu) return [];
        return hierarchy.plants.filter(p => sameId(p.SBUID, selectedSbu.SBUID));
    }, [selectedSbu, hierarchy.plants]);

    const availableLocations = useMemo(() => {
        if (!selectedPlant) return [];
        return hierarchy.locations.filter(l => sameId(l.PlantHierarchyID, selectedPlant.PlantHierarchyID));
    }, [selectedPlant, hierarchy.locations]);

    const locationName = selectedLocation?.LocationName || selectedLocation?.locationName || '';

    // --- HIERARCHY HANDLERS ---
    const handleCompanyChange = (e, val) => { setSelectedCompany(val); setSelectedSbu(null); setSelectedPlant(null); setSelectedLocation(null); };
    const handleSbuChange = (e, val) => { setSelectedSbu(val); setSelectedPlant(null); setSelectedLocation(null); };
    const handlePlantChange = (e, val) => { setSelectedPlant(val); setSelectedLocation(null); };
    const handleLocationChange = (e, val) => { setSelectedLocation(val); };

    const resetPage = (nextContractType = '') => {
        setContractType(nextContractType);
        setInvoices([{ ...createEmptyInvoice(), approverUserId: defaultApproverId }]);
        setCurrentDraftId(null);
        setShowErrors(false);
        setStep(1);
    };

    // Changing the type clears the page, because its fields change.
    const handleContractTypeSelect = (value) => resetPage(value);

    const handleContinueHierarchy = () => {
        if (!selectedCompany || !selectedSbu || !selectedPlant || !selectedLocation) {
            notify('Please select complete hierarchy location.', 'error');
            return;
        }
        setStep(2);
    };

    // --- INVOICE / TRIP EDITING ---
    const updateInvoice = (invoiceId, update) => {
        setInvoices(prev => prev.map(inv => (inv.id === invoiceId ? update(inv) : inv)));
    };

    const handleInvoiceFieldChange = (invoiceId, field, value) => {
        updateInvoice(invoiceId, inv => ({ ...inv, [field]: value }));
    };

    const handleItemChange = (invoiceId, itemId, field, value) => {
        updateInvoice(invoiceId, inv => ({
            ...inv,
            items: inv.items.map(item => (item.id === itemId ? applyItemChange(item, field, value, typeConfig) : item))
        }));
    };

    // Names typed on the page that are not yet in the Customer / Supplier
    // Master are added once, on save, with this page's type (supplier on
    // inbound, customer on outbound) - never on every keystroke.
    const addNewPartiesToMaster = async (invoicesToSend) => {
        const listKey = getPartyListKey(contractType);
        const known = new Set(masterReferences[listKey].map(name => name.toLowerCase()));
        const newNames = [...new Set(
            invoicesToSend.flatMap(inv => inv.items.map(item => item.customerName.trim())).filter(Boolean)
        )].filter(name => !known.has(name.toLowerCase()));

        const results = await Promise.allSettled(newNames.map(customerName =>
            api.post('/invoices/customers', { customerName, partyType: getPartyTypeForContractType(contractType) })
        ));
        const savedNames = newNames.filter((name, index) => results[index].status === 'fulfilled');
        if (savedNames.length > 0) {
            setMasterReferences(prev => ({ ...prev, [listKey]: [...prev[listKey], ...savedNames] }));
        }
    };

    const handlePartyChange = (invoiceId, itemId, value) => {
        handleItemChange(invoiceId, itemId, 'customerName', value);
    };

    // GST numbers of the invoice's own vendor only.
    const getVendorGstOptions = (vendorId) => {
        if (!vendorId) return [];
        return masterReferences.vendorGsts
            .filter(v => sameId(v.VendorID, vendorId))
            .map(v => v.GSTNumber)
            .filter(Boolean);
    };

    // A destination of the previous vendor's contract is not valid for a
    // new vendor, so every trip's city is cleared when the vendor changes.
    const withVendor = (inv, vendorId, vendorName) => ({
        ...inv,
        vendorId,
        vendorName,
        items: sameId(vendorId, inv.vendorId) ? inv.items : inv.items.map(item => ({ ...item, to: '' }))
    });

    // GST SELECTION: resolves VendorGSTID and VendorID from the VendorGST
    // master, scoped to the invoice's vendor when one is selected.
    const handleGstSelect = (invoiceId, gstValue, vendorId) => {
        const cleanGst = (gstValue || '').toUpperCase().trim();
        const candidateGsts = vendorId
            ? masterReferences.vendorGsts.filter(v => sameId(v.VendorID, vendorId))
            : masterReferences.vendorGsts;
        const foundRecord = candidateGsts.find(v => (v.GSTNumber || '').toUpperCase() === cleanGst);
        const matchedVendor = foundRecord ? findById(masterReferences.vendors, 'VendorID', foundRecord.VendorID) : null;

        updateInvoice(invoiceId, inv => ({
            ...withVendor(inv, foundRecord ? foundRecord.VendorID : inv.vendorId, matchedVendor ? matchedVendor.VendorName : inv.vendorName),
            gstNo: cleanGst,
            vendorGstId: foundRecord ? foundRecord.VendorGSTID : null
        }));
    };

    // VENDOR SELECTION: auto-fills the vendor's default GST number
    // (VendorGST.IsDefault), else its first GST on file.
    const handleVendorSelect = (invoiceId, vendorOption) => {
        const vendorId = vendorOption ? vendorOption.VendorID : null;
        const vendorGstRecords = masterReferences.vendorGsts.filter(v => sameId(v.VendorID, vendorId));
        const defaultGst = vendorGstRecords.find(v => v.IsDefault) || vendorGstRecords[0] || null;

        updateInvoice(invoiceId, inv => ({
            ...withVendor(inv, vendorId, vendorOption ? (vendorOption.VendorName || '') : ''),
            gstNo: defaultGst ? (defaultGst.GSTNumber || '').toUpperCase().trim() : '',
            vendorGstId: defaultGst ? defaultGst.VendorGSTID : null
        }));
    };

    // --- FILE UPLOAD HANDLERS ---
    // Large photos are compressed first; then the file and the invoice's
    // documents together must fit the upload limits.
    const handleFileUpload = async (invoiceId, docField, e) => {
        const pickedFile = e.target.files[0];
        e.target.value = '';
        if (!pickedFile) return;
        const file = await compressImageFile(pickedFile);
        const invoice = invoices.find(inv => inv.id === invoiceId);
        const otherSizes = DOCUMENT_FIELDS.filter(({ field }) => field !== docField).map(({ field }) => invoice?.[field]?.size || 0);
        const violation = findUploadRuleViolation(file, UPLOAD_RULES.INVOICE_DOCUMENT)
            || findTotalSizeViolation([...otherSizes, file.size], UPLOAD_RULES.INVOICE_DOCUMENT);
        if (violation) {
            notify(violation, 'error');
            return;
        }
        handleInvoiceFieldChange(invoiceId, docField, file);
    };

    // --- INVOICE / TRIP MANAGEMENT ---
    const handleAddInvoice = () => {
        if (invoices.length >= MAX_INVOICES) return;
        setInvoices(prev => [...prev, { ...createEmptyInvoice(), approverUserId: defaultApproverId }]);
    };

    const handleAddItem = (invoiceId) => {
        updateInvoice(invoiceId, inv => (
            inv.items.length >= MAX_ITEMS_PER_INVOICE ? inv : { ...inv, items: [...inv.items, createEmptyItem()] }
        ));
    };

    const handleRemoveItem = (invoiceId, itemId) => {
        updateInvoice(invoiceId, inv => (
            inv.items.length <= 1 ? inv : { ...inv, items: inv.items.filter(item => item.id !== itemId) }
        ));
    };

    // The last invoice is replaced by an empty one so the page never ends
    // up without a card.
    const removeInvoiceFromPage = (invoiceId) => {
        setInvoices(prev => {
            const remaining = prev.filter(inv => inv.id !== invoiceId);
            return remaining.length > 0 ? remaining : [{ ...createEmptyInvoice(), approverUserId: defaultApproverId }];
        });
    };

    const invoiceToRemove = invoices.find(inv => inv.id === invoiceIdToRemove) || null;
    const invoiceToRemoveNumber = invoices.indexOf(invoiceToRemove) + 1;

    const handleZoomIn = () => setZoom(prev => Math.min(prev + ZOOM_STEP, ZOOM_LEVELS[ZOOM_LEVELS.length - 1]));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - ZOOM_STEP, ZOOM_LEVELS[0]));

    const filledInvoiceCount = useMemo(() => invoices.filter(isInvoiceFilled).length, [invoices]);
    const tripCount = useMemo(() => invoices.reduce((sum, inv) => sum + inv.items.length, 0), [invoices]);

    // --- DRAFTS ---
    const getHierarchyIds = () => ({
        companyId: selectedCompany?.CompanyID ?? null,
        sbuId: selectedSbu?.SBUID ?? null,
        plantId: selectedPlant?.PlantHierarchyID ?? null,
        locationId: selectedLocation?.LocationID ?? null
    });

    const saveDraft = async ({ invoicesToSave, draftId = null, title }) => {
        const { draft, files } = serializeDraft({ contractType, hierarchy: getHierarchyIds(), invoices: invoicesToSave, title });
        const saved = await saveInvoiceDraft({ draftId, draft, files });
        reloadDrafts();
        return saved;
    };

    // Saves the whole page; a page opened from a draft updates that draft.
    // Returns the draft id, or null when saving failed.
    const savePageDraft = async () => {
        setIsSavingDraft(true);
        try {
            const saved = await saveDraft({ invoicesToSave: invoices, draftId: currentDraftId });
            const savedDraftId = saved?.DraftID || currentDraftId;
            setCurrentDraftId(savedDraftId);
            return savedDraftId;
        } catch (error) {
            notify(apiErrorMessage(error, 'Failed to save the draft.'), 'error');
            return null;
        } finally {
            setIsSavingDraft(false);
        }
    };

    const handleSavePageDraft = async () => {
        if (await savePageDraft()) notify('Draft saved. You can resume it from Add Invoice at any time.');
    };

    // Saves the draft, then asks who to share it with.
    const handleSaveAndShareDraft = async () => {
        const savedDraftId = await savePageDraft();
        if (savedDraftId) setShareDraftId(savedDraftId);
    };

    const handleDraftShared = (message) => {
        setShareDraftId(null);
        reloadDrafts();
        notify(message);
    };

    // Delete button on an invoice card: ask first, empty cards included.
    const requestRemoveInvoice = (invoiceId) => setInvoiceIdToRemove(invoiceId);

    const handleConfirmRemoveInvoice = () => {
        removeInvoiceFromPage(invoiceIdToRemove);
        setInvoiceIdToRemove(null);
    };

    // Keeps the removed invoice as its own draft, then takes it off the page.
    const handleSaveRemovedInvoiceAsDraft = async () => {
        setIsSavingDraft(true);
        try {
            const label = invoiceToRemove.invoiceBillNo.trim() || `Invoice #${invoiceToRemoveNumber}`;
            await saveDraft({
                invoicesToSave: [invoiceToRemove],
                title: `${getContractTypeLabel(contractType)} - ${label} (removed from page)`
            });
            removeInvoiceFromPage(invoiceIdToRemove);
            setInvoiceIdToRemove(null);
            notify(`${label} saved as a draft and removed from the page.`);
        } catch (error) {
            notify(apiErrorMessage(error, 'Failed to save the draft.'), 'error');
        } finally {
            setIsSavingDraft(false);
        }
    };

    // Re-selects the saved hierarchy; returns true when it is complete.
    const restoreHierarchy = (ids = {}) => {
        const company = findById(hierarchy.companies, 'CompanyID', ids.companyId);
        const sbu = findById(hierarchy.sbus, 'SBUID', ids.sbuId);
        const plant = findById(hierarchy.plants, 'PlantHierarchyID', ids.plantId);
        const location = findById(hierarchy.locations, 'LocationID', ids.locationId);
        setSelectedCompany(company);
        setSelectedSbu(sbu);
        setSelectedPlant(plant);
        setSelectedLocation(location);
        return Boolean(company && sbu && plant && location);
    };

    const handleResumeDraft = async (draftId) => {
        setBusyDraftId(draftId);
        try {
            const draft = await getInvoiceDraft(draftId);
            const restoredInvoices = await restoreDraftInvoices({
                invoices: draft.page?.invoices,
                fileIndex: draft.files,
                downloadFile: (fileKey) => downloadInvoiceDraftFile(draftId, fileKey)
            });
            const hierarchyComplete = restoreHierarchy(draft.page?.hierarchy);
            setContractType(draft.page?.contractType || draft.ContractType);
            setInvoices(restoredInvoices.length > 0 ? restoredInvoices : [createEmptyInvoice()]);
            setCurrentDraftId(draftId);
            setShowErrors(false);
            setStep(hierarchyComplete ? 2 : 1);
            notify(hierarchyComplete ? 'Draft opened.' : 'Draft opened - please select the location again.', hierarchyComplete ? 'success' : 'warning');
        } catch (error) {
            notify(apiErrorMessage(error, 'Failed to open the draft.'), 'error');
        } finally {
            setBusyDraftId(null);
        }
    };

    // Edit Invoice drafts open on the Edit Invoice page.
    const handleResumeFromPanel = (draft) => {
        if (draft.DraftType === DRAFT_TYPES.EDIT) {
            navigate(DRAFT_PAGE_PATHS[DRAFT_TYPES.EDIT], { state: { draftId: draft.DraftID } });
            return;
        }
        handleResumeDraft(draft.DraftID);
    };

    // Opens the draft asked for in the URL / navigation state once the
    // hierarchy it is restored into has loaded.
    useEffect(() => {
        if (!requestedDraftId || requestedDraftHandled || !masterDataLoaded) return;
        setRequestedDraftHandled(true);
        handleResumeDraft(Number(requestedDraftId));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestedDraftId, requestedDraftHandled, masterDataLoaded]);

    const handleConfirmDeleteDraft = async () => {
        setBusyDraftId(draftIdToDelete);
        try {
            await deleteDraft(draftIdToDelete);
            notify('Draft deleted.');
        } catch (error) {
            notify(apiErrorMessage(error, 'Failed to delete the draft.'), 'error');
        } finally {
            setBusyDraftId(null);
            setDraftIdToDelete(null);
        }
    };

    // --- FINAL VALIDATION & SUBMISSION ---
    const buildUploadFormData = (invoicesToSend) => {
        const formData = new FormData();
        const payloadRows = buildPayloadRows({
            invoices: invoicesToSend,
            contractType,
            normalizeDate: normalizeDateForApi,
            // Plant is chosen in Step 1 and sent with every row.
            location: {
                locationId: selectedLocation?.LocationID ?? null,
                locationName,
                plantId: selectedPlant?.PlantHierarchyID ?? null,
                plantName: selectedPlant?.PlantName || selectedPlant?.plantName || null
            }
        });
        formData.append('invoices', JSON.stringify(payloadRows));
        // Lets the server record when the draft was first saved.
        if (currentDraftId) formData.append('draftId', currentDraftId);

        // Documents are sent once per invoice; every trip row of that
        // invoice points at them through its docGroup.
        invoicesToSend.forEach((inv, invoiceIndex) => {
            DOCUMENT_FIELDS.forEach(({ field, uploadKey }) => {
                if (inv[field]) formData.append(`${uploadKey}_${invoiceIndex}`, inv[field]);
            });
        });
        return formData;
    };

    const handleSaveInvoices = async () => {
        setShowErrors(true);
        const validationError = findInvoiceValidationError({
            invoices,
            typeConfig,
            contractType,
            partyLabel,
            getContractEntry,
            isOutsideContract,
            approverStep
        });
        if (validationError) {
            notify(validationError, 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const invoicesToSend = invoices.filter(isInvoiceFilled);
            await addNewPartiesToMaster(invoicesToSend);
            const response = await api.post(
                '/invoices/documents/upload',
                buildUploadFormData(invoicesToSend),
                { headers: { 'Content-Type': 'multipart/form-data' }, timeout: UPLOAD_TIMEOUT_MS }
            );
            if (currentDraftId) {
                await deleteDraft(currentDraftId).catch(() => null);
                reloadDrafts();
            }
            notify(response.data?.message || 'Invoices successfully saved & verified!');
            resetPage(contractType);
        } catch (error) {
            console.error('Submission error:', error);
            notify(apiErrorMessage(error, 'Network or server error during invoice submission.'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderDocumentField = (inv, invoiceNumber, { field, label }) => {
        const required = isSupportingDocumentRequired(inv, contractType) && field === DOCUMENT_FIELDS[0].field;
        const requiredReason = isAdHocInvoiceType(contractType) ? 'Ad-Hoc' : 'Pre-Approved';
        return (
            <InvoiceField
                key={field}
                label={required ? `${label} * (${requiredReason})` : label}
                onActivate={() => setActiveField(`Invoice ${invoiceNumber} : ${label.toUpperCase()}`)}
                error={showErrors && required && !hasSupportingDocument(inv)}
                hint={<UploadRequirementsHint rule={UPLOAD_RULES.INVOICE_DOCUMENT} sx={{ mt: 0.25 }} />}
            >
                {inv[field] ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5, px: 0.5 }}>
                        <Typography variant="caption" noWrap>{inv[field].name}</Typography>
                        <IconButton size="small" onClick={() => handleInvoiceFieldChange(inv.id, field, null)}><CloseIcon fontSize="small" /></IconButton>
                    </Box>
                ) : (
                    <Box>
                        <Button component="label" variant="text" size="small" startIcon={<UploadIcon fontSize="small" />} sx={{ textTransform: 'none', fontSize: '0.75rem', color: '#107c41' }}>
                            Upload
                            <input type="file" hidden accept={UPLOAD_RULES.INVOICE_DOCUMENT.accept} onChange={(e) => handleFileUpload(inv.id, field, e)} />
                        </Button>
                    </Box>
                )}
            </InvoiceField>
        );
    };

    // The approver the uploader picks for this invoice (e.g. HOD).
    const renderApproverField = (inv, activate) => (
        <InvoiceField
            label={`${approverStep.stepName} *`}
            onActivate={activate('APPROVER')}
            error={showErrors && isInvoiceFilled(inv) && !inv.approverUserId}
        >
            <Autocomplete
                options={approverStep.users}
                getOptionLabel={approverLabel}
                isOptionEqualToValue={(o, v) => sameId(o?.UserID, v?.UserID)}
                value={findById(approverStep.users, 'UserID', inv.approverUserId)}
                onChange={(e, val) => handleInvoiceFieldChange(inv.id, 'approverUserId', val ? val.UserID : null)}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        placeholder="Select approver..."
                        size="small"
                        variant="standard"
                        InputProps={{ ...params.InputProps, disableUnderline: true }}
                        inputProps={{ ...params.inputProps, style: CELL_INPUT_STYLE }}
                    />
                )}
            />
        </InvoiceField>
    );

    const renderInvoiceCard = (inv, index) => {
        const invoiceNumber = index + 1;
        const activate = (label) => () => setActiveField(`Invoice ${invoiceNumber} : ${label}`);
        const usesContract = typeConfig.usesContract !== false;
        const contractEntry = usesContract ? getContractEntry(inv.vendorId, contractType) : null;
        const cityLabel = typeConfig.cityLabel.replace(' *', '');

        return (
            <Card key={inv.id} variant="outlined" sx={{ borderRadius: 2, backgroundColor: '#ffffff', border: '1px solid #d1d5db' }}>
                {/* Card header: invoice number, location, total, pre-approval, delete */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, px: 1.5, py: 0.25, backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', borderRadius: '8px 8px 0 0' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#111827' }}>Invoice #{invoiceNumber}</Typography>
                        <Chip size="small" label={locationName || '-'} sx={{ fontWeight: 600 }} />
                        <Chip size="small" variant="outlined" label={`${inv.items.length} trip(s)`} />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Checkbox checked={inv.isPreApproved} onChange={(e) => handleInvoiceFieldChange(inv.id, 'isPreApproved', e.target.checked)} size="small" sx={{ color: '#107c41', '&.Mui-checked': { color: '#107c41' } }} />
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151' }}>Pre-Approved</Typography>
                        </Box>
                        <Chip label={`Total ₹ ${getInvoiceTotal(inv).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} sx={{ fontWeight: 800, color: '#137333', backgroundColor: '#e6f4ea' }} />
                        <IconButton size="small" color="error" onClick={() => requestRemoveInvoice(inv.id)} title="Remove this invoice"><DeleteIcon fontSize="small" /></IconButton>
                    </Box>
                </Box>

                <CardContent sx={{ ...getInvoiceFieldGridSx(isSidebarCollapsed), p: '8px 12px !important' }}>
                    <InvoiceSectionTitle>Invoice details (common to all trips)</InvoiceSectionTitle>

                    {/* Vendor Name - selecting a vendor auto-fills GST NO */}
                    <InvoiceField label="Vendor Name *" onActivate={activate('VENDOR')} error={showErrors && isInvoiceFilled(inv) && !inv.vendorId}>
                        <Autocomplete
                            options={masterReferences.vendors}
                            getOptionLabel={(o) => o?.VendorName || ''}
                            isOptionEqualToValue={(o, v) => sameId(o?.VendorID, v?.VendorID)}
                            value={findById(masterReferences.vendors, 'VendorID', inv.vendorId)}
                            onChange={(e, val) => handleVendorSelect(inv.id, val)}
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

                    {/* GST NO - options scoped to the vendor selected on this invoice */}
                    <InvoiceField label="GST NO * (VendorGST Master)" onActivate={activate('GST NO')}>
                        <EditableAutocompleteCell
                            value={inv.gstNo}
                            options={getVendorGstOptions(inv.vendorId)}
                            placeholder="Type/Select GST..."
                            onChange={(val) => handleGstSelect(inv.id, val, inv.vendorId)}
                        />
                    </InvoiceField>

                    <InvoiceField label="Invoice / Bill No *" onActivate={activate('INVOICE NO')}>
                        <TextField value={inv.invoiceBillNo} onChange={(e) => handleInvoiceFieldChange(inv.id, 'invoiceBillNo', e.target.value)} placeholder="INV-001" size="small" fullWidth variant="standard" slotProps={TEXT_SLOT_PROPS} />
                    </InvoiceField>
                    <InvoiceField label="Invoice Date *" onActivate={activate('INVOICE DATE')}>
                        <DatePicker
                            value={toDayjsValue(inv.invoiceBillDate)}
                            onChange={(newValue) => handleInvoiceFieldChange(inv.id, 'invoiceBillDate', parseDateForApi(newValue))}
                            format={DISPLAY_DATE_FORMAT}
                            slotProps={{ textField: { size: 'small', fullWidth: true, variant: 'standard', slotProps: { input: { disableUnderline: true }, inputLabel: { shrink: true }, htmlInput: { style: CELL_INPUT_STYLE } } } }}
                        />
                    </InvoiceField>

                    {approverStep && renderApproverField(inv, activate)}

                    {DOCUMENT_FIELDS.map((docField) => renderDocumentField(inv, invoiceNumber, docField))}

                    <Box sx={FULL_ROW_SX}>
                        <InvoiceField label={USER_REMARKS_LABEL} onActivate={activate('REMARK BY USER')}>
                            <TextField value={inv.userRemarks} onChange={(e) => handleInvoiceFieldChange(inv.id, 'userRemarks', e.target.value)} placeholder="Your remarks for this invoice (optional)" size="small" fullWidth variant="standard" slotProps={{ ...TEXT_SLOT_PROPS, htmlInput: { ...TEXT_SLOT_PROPS.htmlInput, maxLength: REMARK_MAX_LENGTH } }} />
                        </InvoiceField>
                    </Box>

                    <InvoiceSectionTitle>Trips on this invoice - only what differs per trip</InvoiceSectionTitle>

                    <Box sx={{ ...FULL_ROW_SX, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {inv.items.map((item, itemIndex) => (
                            <InvoiceTripItem
                                key={item.id}
                                item={item}
                                index={itemIndex}
                                canRemove={inv.items.length > 1}
                                typeConfig={typeConfig}
                                partyLabel={partyLabel}
                                partyOptions={partyOptions}
                                vehicleTypes={masterReferences.vehicleTypes}
                                destinationOptions={contractEntry?.destinations || []}
                                destinationPlaceholder={usesContract ? getDestinationPlaceholder(contractEntry, cityLabel) : 'Type destination city'}
                                showErrors={showErrors && isInvoiceFilled(inv)}
                                isSidebarCollapsed={isSidebarCollapsed}
                                onChange={(field, value) => handleItemChange(inv.id, item.id, field, value)}
                                onPartyChange={(value) => handlePartyChange(inv.id, item.id, value)}
                                onRemove={() => handleRemoveItem(inv.id, item.id)}
                                onActivate={(field) => setActiveField(`Invoice ${invoiceNumber} · Trip ${itemIndex + 1} : ${field.toUpperCase()}`)}
                            />
                        ))}
                        <Box>
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<AddTripIcon />}
                                onClick={() => handleAddItem(inv.id)}
                                disabled={inv.items.length >= MAX_ITEMS_PER_INVOICE}
                                sx={{ textTransform: 'none', fontWeight: 600, borderColor: '#107c41', color: '#107c41' }}
                            >
                                Add Trip to this Invoice ({inv.items.length}/{MAX_ITEMS_PER_INVOICE})
                            </Button>
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        );
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Box sx={{ p: { xs: 1.5, md: 2 }, backgroundColor: '#f0f2f5', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
            {/* Header Title */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <GridOnIcon sx={{ color: '#107c41' }} /> Add Invoice — Lightning Excel Sheet
                </Typography>
                {step === 2 && contractType && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: '#ffffff', px: 2, py: 0.8, borderRadius: 2, border: '1px solid #d1d5db' }}>
                        <Typography variant="caption" sx={{ color: '#4b5563', fontWeight: 600 }}>Active Cell:</Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{activeField}</Typography>
                    </Box>
                )}
            </Box>

            {/* STEP 0: CONTRACT TYPE (or resume a saved draft) */}
            {!contractType && (
                <>
                    <InvoiceDraftsPanel
                        drafts={drafts}
                        busyDraftId={busyDraftId}
                        onResume={handleResumeFromPanel}
                        onDelete={setDraftIdToDelete}
                    />
                    <Card variant="outlined" sx={{ borderRadius: 3, backgroundColor: '#ffffff', border: '1px solid #e5e7eb', maxWidth: 760, mx: 'auto' }}>
                        <CardContent sx={{ p: 4 }}>
                            <ContractTypePicker
                                title="Which type of invoices are you entering?"
                                subtitle="Invoice columns and the contract audit depend on the type. Ad-Hoc invoices have no contract and always go for approval."
                                onSelect={handleContractTypeSelect}
                                options={INVOICE_TYPE_OPTIONS}
                            />
                        </CardContent>
                    </Card>
                </>
            )}

            {/* STEP 1: HIERARCHY SELECTOR */}
            {contractType && step === 1 && (
                <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', maxWidth: 650, mx: 'auto' }}>
                    <CardContent sx={{ p: 4 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, borderBottom: '2px solid #f3f4f6', pb: 1.5 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#111827' }}>
                                Step 1: Select Location Hierarchy
                            </Typography>
                            <Chip size="small" color="success" variant="outlined" label={getContractTypeLabel(contractType)} onDelete={() => handleContractTypeSelect('')} />
                        </Box>

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
                                    sx={{ ...PRIMARY_BUTTON_SX, px: 4, py: 1.2, borderRadius: 2 }}
                                >
                                    Next
                                </Button>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            )}

            {/* STEP 2: INVOICE CARDS */}
            {contractType && step === 2 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {/* Active Context Bar */}
                    <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: '#ffffff', border: '1px solid #d1d5db' }}>
                        <CardContent sx={{ p: '8px 16px !important', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Typography variant="body1" sx={{ fontWeight: 700, color: '#111827' }}>
                                    {selectedCompany?.CompanyName || selectedCompany?.companyName}
                                </Typography>
                                <Divider orientation="vertical" flexItem />
                                <Chip size="small" color="success" variant="outlined" label={getContractTypeLabel(contractType)} />
                                {currentDraftId && <Chip size="small" color="warning" variant="outlined" label="Editing a saved draft" />}
                                <Divider orientation="vertical" flexItem />
                                <Typography variant="body2" sx={{ color: '#374151', fontWeight: 500 }}>
                                    {selectedSbu?.SBUName || selectedSbu?.sbuName} → {selectedPlant?.PlantName || selectedPlant?.plantName} → <strong style={{ color: '#107c41' }}>{locationName}</strong>
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
                        <CardContent sx={{ p: '6px 16px !important', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Button
                                    variant="contained"
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={handleAddInvoice}
                                    disabled={invoices.length >= MAX_INVOICES}
                                    sx={{ ...PRIMARY_BUTTON_SX, fontWeight: 600 }}
                                >
                                    Add Invoice
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<SaveAsIcon />}
                                    onClick={handleSavePageDraft}
                                    disabled={isSavingDraft || isSubmitting}
                                    sx={{ textTransform: 'none', fontWeight: 600, borderColor: '#107c41', color: '#107c41' }}
                                >
                                    {isSavingDraft ? 'Saving Draft...' : 'Save Draft'}
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<ShareIcon />}
                                    onClick={handleSaveAndShareDraft}
                                    disabled={isSavingDraft || isSubmitting}
                                    sx={{ textTransform: 'none', fontWeight: 600, borderColor: '#2563eb', color: '#2563eb' }}
                                >
                                    Save &amp; Share
                                </Button>
                                <Typography variant="body2" sx={{ color: '#4b5563', fontWeight: 600, px: 1, borderLeft: '2px solid #e5e7eb' }}>
                                    Invoices: <span style={{ color: '#111827' }}>{invoices.length}</span> / {MAX_INVOICES} · Trips: <span style={{ color: '#111827' }}>{tripCount}</span>
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#f3f4f6', p: '2px 8px', borderRadius: 1.5, border: '1px solid #e5e7eb' }}>
                                <IconButton size="small" onClick={handleZoomOut} disabled={zoom <= ZOOM_LEVELS[0]}><ZoomOutIcon fontSize="small" /></IconButton>
                                <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 35, textAlign: 'center' }}>{zoom}%</Typography>
                                <IconButton size="small" onClick={handleZoomIn} disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}><ZoomInIcon fontSize="small" /></IconButton>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Invoice cards - shared invoice fields, then one block per trip */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, zoom: zoom / 100 }}>
                        {invoices.map(renderInvoiceCard)}
                    </Box>

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, flexWrap: 'wrap' }}>
                        <Button variant="outlined" onClick={() => handleContractTypeSelect('')} sx={{ textTransform: 'none', px: 3, borderRadius: 2, fontWeight: 600, borderColor: '#d1d5db', color: '#374151' }}>Cancel</Button>
                        <Button variant="outlined" startIcon={<SaveAsIcon />} onClick={handleSavePageDraft} disabled={isSavingDraft || isSubmitting} sx={{ textTransform: 'none', px: 3, borderRadius: 2, fontWeight: 600, borderColor: '#107c41', color: '#107c41' }}>
                            {isSavingDraft ? 'Saving Draft...' : 'Save Draft'}
                        </Button>
                        <Button variant="outlined" startIcon={<ShareIcon />} onClick={handleSaveAndShareDraft} disabled={isSavingDraft || isSubmitting} sx={{ textTransform: 'none', px: 3, borderRadius: 2, fontWeight: 600, borderColor: '#2563eb', color: '#2563eb' }}>
                            Save &amp; Share
                        </Button>
                        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveInvoices} disabled={isSubmitting || isSavingDraft || filledInvoiceCount === 0} sx={{ ...PRIMARY_BUTTON_SX, px: 4, py: 1.2, borderRadius: 2 }}>
                            {isSubmitting ? 'Saving Invoices...' : 'Save Invoices'}
                        </Button>
                    </Box>
                </Box>
            )}

            <RemoveInvoiceDialog
                open={Boolean(invoiceToRemove)}
                invoiceLabel={invoiceToRemove ? `Invoice #${invoiceToRemoveNumber}${invoiceToRemove.invoiceBillNo.trim() ? ` (${invoiceToRemove.invoiceBillNo.trim()})` : ''}` : ''}
                canSaveDraft={Boolean(invoiceToRemove) && !isInvoiceBlank(invoiceToRemove)}
                saving={isSavingDraft}
                onCancel={() => setInvoiceIdToRemove(null)}
                onRemove={handleConfirmRemoveInvoice}
                onSaveDraft={handleSaveRemovedInvoiceAsDraft}
            />

            <ShareDraftDialog
                open={Boolean(shareDraftId)}
                draftId={shareDraftId}
                onClose={() => setShareDraftId(null)}
                onShared={handleDraftShared}
            />

            <DeleteDialog
                open={Boolean(draftIdToDelete)}
                title="Delete Draft"
                message="Delete this saved draft and its attachments? This cannot be undone."
                loading={Boolean(busyDraftId)}
                onClose={() => setDraftIdToDelete(null)}
                onConfirm={handleConfirmDeleteDraft}
            />

            {/* Notification Snackbar */}
            <Snackbar open={snackbar.open} autoHideDuration={5003} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
        </LocalizationProvider>
    );
}
