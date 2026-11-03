import React, { useEffect, useState } from 'react';
import {
    Alert, Autocomplete, Box, Button, Checkbox, Chip, CircularProgress, FormControlLabel, IconButton,
    MenuItem, Paper, TextField, Tooltip, Typography
} from '@mui/material';
import {
    Add as AddIcon,
    ArrowDownward as ArrowDownIcon,
    ArrowUpward as ArrowUpIcon,
    Delete as DeleteIcon,
    Save as SaveIcon
} from '@mui/icons-material';
import {
    ASSIGN_MODES,
    ASSIGN_MODE_OPTIONS,
    MAX_STEP_NAME_LENGTH,
    MAX_WORKFLOW_STEPS,
    ROUTING_OPTIONS,
    ROUTING_OUTCOMES,
    STEP_TYPES,
    STEP_TYPE_OPTIONS
} from '../../constants/approvalWorkflow';
import { getLocationWorkflow, saveLocationWorkflow } from '../../services/approvalWorkflowService';

let lastStepKey = 0;
const nextStepKey = () => {
    lastStepKey += 1;
    return lastStepKey;
};

const createStep = (overrides = {}) => ({
    key: nextStepKey(),
    stepName: '',
    stepType: STEP_TYPES.APPROVAL,
    assignMode: ASSIGN_MODES.ALL_USERS,
    userIds: [],
    ...overrides
});

// The flow asked for most often: the uploader picks the HOD, then Accounts
// receives the approved invoice.
const DEFAULT_STEPS = () => [
    createStep({ stepName: 'HOD Approval', assignMode: ASSIGN_MODES.UPLOADER_SELECTS }),
    createStep({ stepName: 'Accounts', stepType: STEP_TYPES.NOTIFY })
];

const EMPTY_ROUTING = {
    [ROUTING_OUTCOMES.DISCREPANCY]: '',
    [ROUTING_OUTCOMES.SYSTEM_APPROVED]: '',
    [ROUTING_OUTCOMES.PRE_APPROVED]: ''
};

const fromServer = (workflow) => ({
    steps: (workflow?.steps || []).map((step) => createStep({
        stepName: step.StepName,
        stepType: step.StepType,
        assignMode: step.AssignMode,
        userIds: step.users.map((user) => user.UserID)
    })),
    routing: Object.fromEntries(
        Object.keys(EMPTY_ROUTING).map((outcome) => [outcome, workflow?.routing?.[outcome] ?? ''])
    )
});

const userLabel = (user) => (user?.RoleName ? `${user.FullName} (${user.RoleName})` : user?.FullName || '');

// Routing that pointed past the last step, or at a removed step, is cleared.
const clampRouting = (routing, stepCount) => Object.fromEntries(
    Object.entries(routing).map(([outcome, order]) => [outcome, order && Number(order) <= stepCount ? order : ''])
);

// Approval steps of one location: who approves an invoice entered there,
// in which order, and where each audit outcome starts.
export default function ApprovalWorkflowEditor({ location, plantName, users, onSaved, onError }) {
    const [steps, setSteps] = useState([]);
    const [routing, setRouting] = useState(EMPTY_ROUTING);
    const [applyToPlant, setApplyToPlant] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setApplyToPlant(false);
        getLocationWorkflow(location.LocationID)
            .then((workflow) => {
                if (!isMounted) return;
                const loaded = fromServer(workflow);
                setSteps(loaded.steps);
                setRouting(loaded.routing);
            })
            .catch((error) => onError(error?.response?.data?.message || 'Failed to load the approval workflow.'))
            .finally(() => isMounted && setLoading(false));
        return () => {
            isMounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.LocationID]);

    const updateStep = (key, changes) => {
        setSteps((prev) => prev.map((step) => (step.key === key ? { ...step, ...changes } : step)));
    };

    // A notify step cannot be picked by the uploader.
    const handleStepTypeChange = (key, stepType) => {
        updateStep(key, stepType === STEP_TYPES.NOTIFY ? { stepType, assignMode: ASSIGN_MODES.ALL_USERS } : { stepType });
    };

    const replaceSteps = (nextSteps) => {
        setSteps(nextSteps);
        setRouting((prev) => {
            const clamped = clampRouting(prev, nextSteps.length);
            const discrepancy = clamped[ROUTING_OUTCOMES.DISCREPANCY] || (nextSteps.length ? 1 : '');
            return { ...clamped, [ROUTING_OUTCOMES.DISCREPANCY]: discrepancy };
        });
    };

    const handleAddStep = () => replaceSteps([...steps, createStep()]);
    const handleUseDefault = () => replaceSteps(DEFAULT_STEPS());
    const handleRemoveStep = (key) => replaceSteps(steps.filter((step) => step.key !== key));

    const handleMoveStep = (index, direction) => {
        const target = index + direction;
        if (target < 0 || target >= steps.length) return;
        const reordered = [...steps];
        [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
        setSteps(reordered);
    };

    const hasUploaderStep = (exceptKey) =>
        steps.some((step) => step.key !== exceptKey && step.assignMode === ASSIGN_MODES.UPLOADER_SELECTS);

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                steps: steps.map(({ stepName, stepType, assignMode, userIds }) => ({ stepName, stepType, assignMode, userIds })),
                routing: Object.fromEntries(Object.entries(routing).map(([outcome, order]) => [outcome, order || null])),
                applyToPlant
            };
            const response = await saveLocationWorkflow(location.LocationID, payload);
            onSaved(response.data?.message || 'Approval workflow saved.');
        } catch (error) {
            onError(error?.response?.data?.message || 'Failed to save the approval workflow.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={28} /></Box>;
    }

    const stepOptions = steps.map((step, index) => ({ value: index + 1, label: `Step ${index + 1}: ${step.stepName || 'Unnamed'}` }));

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Alert severity="info" sx={{ py: 0.5 }}>
                A discrepancy invoice first goes to the user who entered it, then to the users of the step it starts at.
                Each approval step must approve before the invoice moves to the next step.
            </Alert>

            {steps.length === 0 && (
                <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', borderStyle: 'dashed' }}>
                    <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary' }}>
                        No approval steps for {location.LocationName} yet. Discrepancy invoices entered here are not sent to anyone.
                    </Typography>
                    <Button variant="contained" size="small" onClick={handleUseDefault} sx={{ textTransform: 'none', mr: 1 }}>
                        Start with HOD, then Accounts
                    </Button>
                    <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={handleAddStep} sx={{ textTransform: 'none' }}>
                        Add an empty step
                    </Button>
                </Paper>
            )}

            {steps.map((step, index) => (
                <Paper key={step.key} variant="outlined" sx={{ p: 2, borderLeft: `4px solid ${step.stepType === STEP_TYPES.APPROVAL ? '#2563eb' : '#94a3b8'}` }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip size="small" label={`Step ${index + 1}`} color={step.stepType === STEP_TYPES.APPROVAL ? 'primary' : 'default'} />
                            {routing[ROUTING_OUTCOMES.DISCREPANCY] === index + 1 && <Chip size="small" variant="outlined" label="Discrepancies start here" />}
                        </Box>
                        <Box>
                            <Tooltip title="Move up"><span><IconButton size="small" disabled={index === 0} onClick={() => handleMoveStep(index, -1)}><ArrowUpIcon fontSize="small" /></IconButton></span></Tooltip>
                            <Tooltip title="Move down"><span><IconButton size="small" disabled={index === steps.length - 1} onClick={() => handleMoveStep(index, 1)}><ArrowDownIcon fontSize="small" /></IconButton></span></Tooltip>
                            <Tooltip title="Remove step"><IconButton size="small" color="error" onClick={() => handleRemoveStep(step.key)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                        <TextField
                            size="small"
                            label="Step name *"
                            placeholder="e.g. HOD Approval, Accounts"
                            value={step.stepName}
                            onChange={(e) => updateStep(step.key, { stepName: e.target.value })}
                            slotProps={{ htmlInput: { maxLength: MAX_STEP_NAME_LENGTH } }}
                        />
                        <TextField
                            select
                            size="small"
                            label="Step type"
                            value={step.stepType}
                            onChange={(e) => handleStepTypeChange(step.key, e.target.value)}
                            helperText={STEP_TYPE_OPTIONS.find((option) => option.value === step.stepType)?.description}
                        >
                            {STEP_TYPE_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                        </TextField>
                        <TextField
                            select
                            size="small"
                            label="Who receives it"
                            value={step.assignMode}
                            onChange={(e) => updateStep(step.key, { assignMode: e.target.value })}
                            helperText={ASSIGN_MODE_OPTIONS.find((option) => option.value === step.assignMode)?.description}
                        >
                            {ASSIGN_MODE_OPTIONS.map((option) => (
                                <MenuItem
                                    key={option.value}
                                    value={option.value}
                                    disabled={option.value === ASSIGN_MODES.UPLOADER_SELECTS && (step.stepType !== STEP_TYPES.APPROVAL || hasUploaderStep(step.key))}
                                >
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>
                        <Autocomplete
                            multiple
                            size="small"
                            options={users}
                            getOptionLabel={userLabel}
                            isOptionEqualToValue={(o, v) => o.UserID === v.UserID}
                            value={users.filter((user) => step.userIds.includes(user.UserID))}
                            onChange={(e, selected) => updateStep(step.key, { userIds: selected.map((user) => user.UserID) })}
                            renderInput={(params) => <TextField {...params} label="Users *" placeholder="Search users..." />}
                        />
                    </Box>
                </Paper>
            ))}

            {steps.length > 0 && (
                <Box>
                    <Button size="small" startIcon={<AddIcon />} onClick={handleAddStep} disabled={steps.length >= MAX_WORKFLOW_STEPS} sx={{ textTransform: 'none' }}>
                        Add step ({steps.length}/{MAX_WORKFLOW_STEPS})
                    </Button>
                </Box>
            )}

            {steps.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Where each invoice goes after the audit</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                        {ROUTING_OPTIONS.map((option) => (
                            <TextField
                                key={option.value}
                                select
                                size="small"
                                label={option.label}
                                value={routing[option.value]}
                                onChange={(e) => setRouting((prev) => ({ ...prev, [option.value]: e.target.value }))}
                                required={option.required}
                            >
                                {!option.required && <MenuItem value="">Nobody - status stays as audited</MenuItem>}
                                {stepOptions.map((stepOption) => <MenuItem key={stepOption.value} value={stepOption.value}>{stepOption.label}</MenuItem>)}
                            </TextField>
                        ))}
                    </Box>
                </Paper>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <FormControlLabel
                    control={<Checkbox checked={applyToPlant} onChange={(e) => setApplyToPlant(e.target.checked)} />}
                    label={`Apply the same workflow to every location of plant ${plantName || ''}`}
                />
                <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving} sx={{ textTransform: 'none', fontWeight: 600 }}>
                    {saving ? 'Saving...' : 'Save workflow'}
                </Button>
            </Box>
        </Box>
    );
}
