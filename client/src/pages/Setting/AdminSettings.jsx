import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Typography, TextField, Button, Paper, Grid, Alert, IconButton, Tooltip,
    Accordion, AccordionSummary, AccordionDetails, Chip, InputAdornment
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BusinessIcon from '@mui/icons-material/Business';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import FactoryIcon from '@mui/icons-material/Factory';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonPinIcon from '@mui/icons-material/PersonPin';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import api from '../../services/api';
import ApprovalWorkflowEditor from '../../components/approvalWorkflow/ApprovalWorkflowEditor';
import { STEP_TYPES } from '../../constants/approvalWorkflow';

// Human-friendly copy shown at the top of the right-hand form panel,
// keyed by targetType, so it's always obvious *why* the form is showing
// these particular fields — this is the core "clear at a glance" fix for
// the Settings & Hierarchy redesign.
const FORM_COPY = {
    company: {
        add: { title: 'Add a Company', subtitle: 'Companies sit at the top of the hierarchy. Add one to start building out its SBUs, plants, and locations.' },
        edit: { title: 'Edit Company', subtitle: 'Rename this company. Its SBUs, plants, and locations underneath are unaffected.' },
    },
    sbu: {
        add: { title: 'Add an SBU', subtitle: 'An SBU (Strategic Business Unit) groups plants under a company.' },
        edit: { title: 'Edit SBU', subtitle: 'Rename this SBU. Its plants and locations underneath are unaffected.' },
    },
    plant: {
        add: { title: 'Add a Plant', subtitle: 'A plant belongs to an SBU and contains one or more locations.' },
        edit: { title: 'Edit Plant', subtitle: 'Rename this plant. Its locations underneath are unaffected.' },
    },
    location: {
        add: { title: 'Add a Location', subtitle: 'A location is the most specific point in the hierarchy — this is what gets selected when uploading an invoice.' },
        edit: { title: 'Edit Location', subtitle: 'Rename this location.' },
    },
    workflow: {
        add: { title: 'Approval Workflow', subtitle: 'Choose who approves invoices entered at this location, in which order.' },
        edit: { title: 'Approval Workflow', subtitle: 'Choose who approves invoices entered at this location, in which order.' },
    },
};

// One line per step for the tree, e.g. "1. HOD Approval: Ravi, Meena".
const describeWorkflowSteps = (workflow) => (workflow?.steps || []).map((step) =>
    `${step.StepOrder}. ${step.StepName}${step.StepType === STEP_TYPES.NOTIFY ? ' (notify)' : ''}: ${step.users.map((user) => user.FullName).join(', ')}`
);

export default function AdminSettings() {
    const [metadata, setMetadata] = useState({ companies: [], sbus: [], plants: [], locations: [], users: [], workflows: [] });
    const [message, setMessage] = useState({ type: '', text: '' });
    const [searchTerm, setSearchTerm] = useState('');

    const [formMode, setFormMode] = useState('add');
    const [targetType, setTargetType] = useState('company'); 
    const [activeId, setActiveId] = useState(null);
    const [parentID, setParentID] = useState('');
    const [itemName, setItemName] = useState('');

    // Location whose approval workflow is open in the right panel.
    const [workflowTarget, setWorkflowTarget] = useState(null);

    useEffect(() => {
        fetchMetadata();
    }, []);

    const fetchMetadata = async () => {
        try {
            const res = await api.get('/settings/metadata');
            if (res.data.success) {
                setMetadata(res.data.data);
            }
        } catch (err) {
            console.error("Error fetching metadata", err);
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                type: targetType,
                name: itemName,
                parentID: parentID || null,
                mode: formMode,
                id: activeId
            };

            const res = await api.post('/settings/master', payload);
            if (res.data.success) {
                setMessage({ type: 'success', text: res.data.message });
                setItemName('');
                fetchMetadata();
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Error occurred' });
        }
    };

    // Working search filter: a company/SBU/plant "matches" if its own name
    // matches, or if the search term is empty. Filtering happens at render
    // time via these helper predicates so the tree only shows relevant
    // branches while typing — the search box was previously decorative and
    // did nothing at all.
    const term = searchTerm.trim().toLowerCase();
    const matches = (name) => !term || String(name || '').toLowerCase().includes(term);

    const filteredCompanies = useMemo(() => {
        if (!term) return metadata.companies;
        return metadata.companies.filter((c) => {
            if (matches(c.CompanyName)) return true;
            const sbusUnder = metadata.sbus.filter(s => s.CompanyID === c.CompanyID);
            return sbusUnder.some(s => {
                if (matches(s.SBUName)) return true;
                const plantsUnder = metadata.plants.filter(p => p.SBUID === s.SBUID);
                return plantsUnder.some(p => {
                    if (matches(p.PlantName)) return true;
                    const locationsUnder = metadata.locations.filter(l => l.PlantHierarchyID === p.PlantHierarchyID);
                    return locationsUnder.some(l => matches(l.LocationName));
                });
            });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [term, metadata]);

    const formCopy = FORM_COPY[targetType]?.[formMode] || FORM_COPY.company.add;
    const formTitle = targetType === 'workflow' && workflowTarget ? `${formCopy.title}: ${workflowTarget.location.LocationName}` : formCopy.title;

    const handleWorkflowSaved = (text) => {
        setMessage({ type: 'success', text });
        fetchMetadata();
    };

    return (
        <Box>
            <PageHeader
                title="Hierarchy & Approval Workflow"
                subtitle="Manage your organization structure (Company → SBU → Plant → Location) and who approves the invoices entered at each location."
                breadcrumbs={[
                    { label: 'Dashboard', path: '/dashboard' },
                    { label: 'Hierarchy & Approval Workflow' },
                ]}
            />

            {message.text && <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage({ type: '', text: '' })}>{message.text}</Alert>}

            {/* At-a-glance summary counts */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Companies" value={metadata.companies.length} subtitle="Companies" icon={<BusinessIcon />} color="primary" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="SBUs" value={metadata.sbus.length} subtitle="SBUs" icon={<AccountTreeIcon />} color="success" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Plants" value={metadata.plants.length} subtitle="Plants" icon={<FactoryIcon />} color="warning" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard title="Locations" value={metadata.locations.length} subtitle="Locations" icon={<LocationOnIcon />} color="error" />
                </Grid>
            </Grid>

            <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', flexWrap: { xs: 'wrap', md: 'nowrap' } }}>

                {/* Left Panel: Organization Tree View */}
                <Box sx={{ width: { xs: '100%', md: '42%' }, flexShrink: 0 }}>
                    <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #E5E7EB', boxShadow: '0 4px 18px rgba(15,23,42,0.05)' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>Organization Tree</Typography>
                            <Button
                                size="small"
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => { setTargetType('company'); setFormMode('add'); setItemName(''); }}
                                sx={{ textTransform: 'none', fontWeight: 600 }}
                            >
                                Add Company
                            </Button>
                        </Box>

                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search company, SBU, plant, or location..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            sx={{ mb: 2 }}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" />
                                        </InputAdornment>
                                    ),
                                }
                            }}
                        />

                        {metadata.companies.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 5, color: '#6b7280' }}>
                                <BusinessIcon sx={{ fontSize: 40, mb: 1, color: '#cbd5e1' }} />
                                <Typography variant="body2">No companies yet.</Typography>
                                <Typography variant="caption">Click "Add Company" above to get started.</Typography>
                            </Box>
                        ) : filteredCompanies.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 5, color: '#6b7280' }}>
                                <SearchIcon sx={{ fontSize: 32, mb: 1, color: '#cbd5e1' }} />
                                <Typography variant="body2">No matches for "{searchTerm}".</Typography>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: '650px', overflowY: 'auto', pr: 0.5 }}>
                                {filteredCompanies.map(c => (
                                    <Accordion
                                        key={c.CompanyID}
                                        defaultExpanded={Boolean(term)}
                                        disableGutters
                                        sx={{ borderRadius: 2, border: '1px solid #e2e8f0', '&:before': { display: 'none' }, boxShadow: 'none' }}
                                    >
                                        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: '#f8fafc', borderRadius: 2 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', pr: 1 }}>
                                                <Typography variant="body2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <BusinessIcon fontSize="small" color="primary" /> {c.CompanyName}
                                                    <Chip size="small" label={`${metadata.sbus.filter(s => s.CompanyID === c.CompanyID).length} SBU`} sx={{ height: 20, fontSize: '0.7rem' }} />
                                                </Typography>
                                                <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
                                                    <Tooltip title="Edit Company"><IconButton size="small" onClick={() => { setTargetType('company'); setFormMode('edit'); setActiveId(c.CompanyID); setItemName(c.CompanyName); }}><EditIcon fontSize="small"/></IconButton></Tooltip>
                                                    <Tooltip title="Add SBU"><IconButton size="small" color="primary" onClick={() => { setTargetType('sbu'); setFormMode('add'); setParentID(c.CompanyID); setItemName(''); }}><AddIcon fontSize="small" /></IconButton></Tooltip>
                                                </Box>
                                            </Box>
                                        </AccordionSummary>
                                        <AccordionDetails sx={{ pt: 1 }}>
                                            {metadata.sbus.filter(s => s.CompanyID === c.CompanyID).length === 0 && (
                                                <Typography variant="caption" sx={{ color: '#9ca3af', pl: 1 }}>No SBUs yet under this company.</Typography>
                                            )}
                                            {metadata.sbus.filter(s => s.CompanyID === c.CompanyID).map(s => (
                                                <Box key={s.SBUID} sx={{ pl: 1.5, borderLeft: '3px solid #93c5fd', mb: 1.5 }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5, pl: 1 }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <AccountTreeIcon fontSize="small" color="action" /> {s.SBUName}
                                                            <Chip size="small" label={`${metadata.plants.filter(p => p.SBUID === s.SBUID).length} Plant`} sx={{ height: 18, fontSize: '0.65rem' }} />
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                            <Tooltip title="Edit SBU"><IconButton size="small" onClick={() => { setTargetType('sbu'); setFormMode('edit'); setActiveId(s.SBUID); setItemName(s.SBUName); }}><EditIcon fontSize="small"/></IconButton></Tooltip>
                                                            <Tooltip title="Add Plant"><IconButton size="small" color="primary" onClick={() => { setTargetType('plant'); setFormMode('add'); setParentID(s.SBUID); setItemName(''); }}><AddIcon fontSize="small" /></IconButton></Tooltip>
                                                        </Box>
                                                    </Box>

                                                    {metadata.plants.filter(p => p.SBUID === s.SBUID).map(p => (
                                                        <Box key={p.PlantHierarchyID} sx={{ pl: 1.5, borderLeft: '3px solid #fcd34d', ml: 1, my: 1 }}>
                                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5, pl: 1, bgcolor: '#fffbeb', borderRadius: 1 }}>
                                                                <Typography variant="body2" sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    <FactoryIcon fontSize="small" sx={{ color: '#d97706' }} /> {p.PlantName}
                                                                </Typography>
                                                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                                    <Tooltip title="Edit Plant"><IconButton size="small" onClick={() => { setTargetType('plant'); setFormMode('edit'); setActiveId(p.PlantHierarchyID); setItemName(p.PlantName); }}><EditIcon fontSize="small"/></IconButton></Tooltip>
                                                                    <Tooltip title="Add Location"><IconButton size="small" color="primary" onClick={() => { setTargetType('location'); setFormMode('add'); setParentID(p.PlantHierarchyID); setItemName(''); }}><AddIcon fontSize="small" /></IconButton></Tooltip>
                                                                </Box>
                                                            </Box>

                                                            {/* Locations under Plant */}
                                                            {metadata.locations.filter(l => l.PlantHierarchyID === p.PlantHierarchyID).map(l => {
                                                                const stepLines = describeWorkflowSteps(metadata.workflows?.find(w => w.locationId === l.LocationID));
                                                                return (
                                                                    <Box key={l.LocationID} sx={{ pl: 1.5, borderLeft: '3px solid #fca5a5', ml: 1, my: 1 }}>
                                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', py: 1, pl: 1, bgcolor: '#fef2f2', borderRadius: 1 }}>
                                                                            <Box>
                                                                                <Typography variant="body2" sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                                    <LocationOnIcon fontSize="small" color="error" /> {l.LocationName}
                                                                                </Typography>
                                                                                {stepLines.length ? (
                                                                                    <Box sx={{ pl: 3, mt: 0.5 }}>
                                                                                        {stepLines.map((line) => (
                                                                                            <Typography key={line} variant="caption" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                                                <PersonPinIcon fontSize="small" color="success" /> {line}
                                                                                            </Typography>
                                                                                        ))}
                                                                                    </Box>
                                                                                ) : (
                                                                                    <Typography variant="caption" sx={{ pl: 3, color: '#9ca3af' }}>No approval workflow yet</Typography>
                                                                                )}
                                                                            </Box>
                                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                                                                                <Tooltip title="Edit Location"><IconButton size="small" onClick={() => { setTargetType('location'); setFormMode('edit'); setActiveId(l.LocationID); setItemName(l.LocationName); }}><EditIcon fontSize="small"/></IconButton></Tooltip>
                                                                                <Tooltip title="Configure Approval Workflow">
                                                                                    <IconButton
                                                                                        size="small"
                                                                                        color="secondary"
                                                                                        onClick={() => {
                                                                                            setTargetType('workflow');
                                                                                            setFormMode('edit');
                                                                                            setWorkflowTarget({ location: l, plantName: p.PlantName });
                                                                                        }}
                                                                                    >
                                                                                        <PersonPinIcon fontSize="small" />
                                                                                    </IconButton>
                                                                                </Tooltip>
                                                                            </Box>
                                                                        </Box>
                                                                    </Box>
                                                                );
                                                            })}
                                                        </Box>
                                                    ))}
                                                </Box>
                                            ))}
                                        </AccordionDetails>
                                    </Accordion>
                                ))}
                            </Box>
                        )}
                    </Paper>
                </Box>

                {/* Right Panel: Contextual Dynamic Form */}
                <Box sx={{ width: { xs: '100%', md: '58%' }, flexGrow: 1 }}>
                    <Paper sx={{ borderRadius: 3, border: '1px solid #E5E7EB', boxShadow: '0 4px 18px rgba(15,23,42,0.05)', overflow: 'hidden' }}>
                        {/* Clear, colored context header so it's always obvious what
                            this form does and why it's showing these fields. */}
                        <Box sx={{ p: 3, bgcolor: '#1e293b', color: '#fff', display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <SettingsSuggestIcon />
                            </Box>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{formTitle}</Typography>
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)' }}>{formCopy.subtitle}</Typography>
                            </Box>
                        </Box>

                        <Box sx={{ p: 4 }}>
                            {targetType === 'workflow' && workflowTarget ? (
                                <ApprovalWorkflowEditor
                                    location={workflowTarget.location}
                                    plantName={workflowTarget.plantName}
                                    users={metadata.users}
                                    onSaved={handleWorkflowSaved}
                                    onError={(text) => setMessage({ type: 'error', text })}
                                />
                            ) : (
                                <form onSubmit={handleFormSubmit}>
                                    <Grid container spacing={3}>
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label={`${targetType.toUpperCase()} Name *`}
                                                value={itemName}
                                                onChange={(e) => setItemName(e.target.value)}
                                                required
                                            />
                                        </Grid>

                                        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
                                            <Button variant="outlined" color="inherit" onClick={() => { setItemName(''); }} sx={{ textTransform: 'none' }}>Cancel</Button>
                                            <Button type="submit" variant="contained" startIcon={<SaveIcon />} sx={{ textTransform: 'none', fontWeight: 600 }}>Save Changes</Button>
                                        </Grid>
                                    </Grid>
                                </form>
                            )}
                        </Box>
                    </Paper>
                </Box>
            </Box>
        </Box>
    );
}
