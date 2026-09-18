import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    FormControlLabel,
    Switch,
    Checkbox,
    Button,
    Divider,
    Alert,
    Snackbar,
    List,
    ListItem,
    ListItemText,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    ToggleButtonGroup,
    ToggleButton,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import * as userService from '../../services/userService';
import * as moduleService from '../../services/moduleService';
import * as accessRequestService from '../../services/accessRequestService';
import { MODULE_KEYS, MODULE_LABELS } from '../../constants/modules';

// NOTE: A light/dark theme toggle was intentionally left out of this page.
// The app currently defines a single static MUI theme (src/styles/theme.js)
// with no ThemeProvider-level mode switching, so there is nothing yet for a
// toggle here to actually control. Add it once that infrastructure exists.

export default function UserSettings() {
    const [preferences, setPreferences] = useState({
        NotificationEmailEnabled: true,
        NotificationSoundEnabled: true,
        permittedPlants: [],
        defaultPlantIds: [],
    });
    const [selectedPlantIds, setSelectedPlantIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // Generalized "Request Access" dialog state (task item 19): a user can
    // request access to any module (with View/Add/Edit) or to a specific
    // plant/location, not just a location as before.
    const [allPlants, setAllPlants] = useState([]);
    const [requestDialogOpen, setRequestDialogOpen] = useState(false);
    const [requestType, setRequestType] = useState('MODULE');
    const [requestModuleKey, setRequestModuleKey] = useState('');
    const [requestAction, setRequestAction] = useState('view');
    const [requestPlantId, setRequestPlantId] = useState('');
    const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

    const showSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    const loadData = async () => {
        try {
            const [preferencesRes, plantsRes] = await Promise.all([
                userService.getPreferences(),
                moduleService.getRecords({ apiGroup: 'masters', moduleName: 'plants', params: { pageSize: 1000 } }),
            ]);
            const fetchedPreferences = preferencesRes.data?.data;

            if (fetchedPreferences) {
                setPreferences(fetchedPreferences);
                setSelectedPlantIds(fetchedPreferences.defaultPlantIds || []);
            }
            setAllPlants(plantsRes.data?.data || []);
        } catch (err) {
            console.error('Failed to load settings', err);
            showSnackbar('Failed to load your settings.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleToggle = (field) => (e) => {
        setPreferences((prev) => ({ ...prev, [field]: e.target.checked }));
    };

    const handlePlantCheckToggle = (plantId) => {
        setSelectedPlantIds((prev) =>
            prev.includes(plantId) ? prev.filter((id) => id !== plantId) : [...prev, plantId]
        );
    };

    const handleOpenRequestDialog = () => {
        setRequestType('MODULE');
        setRequestModuleKey('');
        setRequestAction('view');
        setRequestPlantId('');
        setRequestDialogOpen(true);
    };

    const handleSubmitAccessRequest = async () => {
        setIsSubmittingRequest(true);
        try {
            const payload = requestType === 'MODULE'
                ? { requestType: 'MODULE', moduleKey: requestModuleKey, requestedAction: requestAction }
                : { requestType: 'LOCATION', plantId: requestPlantId };

            await accessRequestService.createAccessRequest(payload);
            showSnackbar('Your request has been sent to the admin.');
            setRequestDialogOpen(false);
        } catch (err) {
            showSnackbar(err.response?.data?.message || 'Failed to send request.', 'error');
        } finally {
            setIsSubmittingRequest(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const payload = {
                notificationEmailEnabled: preferences.NotificationEmailEnabled,
                notificationSoundEnabled: preferences.NotificationSoundEnabled,
                defaultPlantIds: selectedPlantIds,
            };

            const res = await userService.updatePreferences(payload);
            setPreferences(res.data.data);
            setSelectedPlantIds(res.data.data.defaultPlantIds || []);
            showSnackbar('Settings saved successfully.');
        } catch (err) {
            const message = err.response?.data?.errors?.join(', ') || err.response?.data?.message || 'Failed to save settings.';
            showSnackbar(message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ maxWidth: 700, mx: 'auto' }}>
                <Typography>Loading your settings...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 700, mx: 'auto' }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>My Settings</Typography>

            <Card sx={{ mb: 3 }}>
                <CardContent sx={{ p: 4 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Notifications</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Choose how you'd like to be notified about invoice audit alerts.
                    </Typography>

                    <FormControlLabel
                        control={
                            <Switch
                                checked={preferences.NotificationEmailEnabled}
                                onChange={handleToggle('NotificationEmailEnabled')}
                            />
                        }
                        label="Email notifications"
                    />
                    <br />
                    <FormControlLabel
                        control={
                            <Switch
                                checked={preferences.NotificationSoundEnabled}
                                onChange={handleToggle('NotificationSoundEnabled')}
                            />
                        }
                        label="Sound notifications"
                    />
                </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
                <CardContent sx={{ p: 4 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Default Plant / Location</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Check every plant you work with. Only plants your admin has granted you
                        access to are listed here.
                    </Typography>

                    {preferences.permittedPlants?.length ? (
                        <List dense disablePadding>
                            {preferences.permittedPlants.map((plant) => (
                                <ListItem key={plant.PlantID} disableGutters>
                                    <Checkbox
                                        checked={selectedPlantIds.includes(plant.PlantID)}
                                        onChange={() => handlePlantCheckToggle(plant.PlantID)}
                                    />
                                    <ListItemText primary={plant.PlantName || plant.PlantCode} secondary={plant.City} />
                                </ListItem>
                            ))}
                        </List>
                    ) : (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            You don't have access to any plants/locations yet. Ask your admin to
                            grant access, or request it below.
                        </Alert>
                    )}

                    <Button
                        variant="outlined"
                        size="small"
                        sx={{ mt: 1 }}
                        onClick={handleOpenRequestDialog}
                    >
                        Request Access
                    </Button>
                </CardContent>
            </Card>

            <Divider sx={{ mb: 3 }} />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>
            </Box>

            {/* Generalized "Request Access" dialog (task item 19) - lets a user
                request access to any module (with a View/Add/Edit choice) or a
                specific plant/location, not just a location as before. */}
            <Dialog open={requestDialogOpen} onClose={() => setRequestDialogOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Request Access</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Tell your admin what you're missing access to. They'll get a notification
                        and can approve or reject the request.
                    </Typography>

                    <ToggleButtonGroup
                        value={requestType}
                        exclusive
                        onChange={(e, val) => val && setRequestType(val)}
                        size="small"
                        sx={{ mb: 3 }}
                    >
                        <ToggleButton value="MODULE">A module permission</ToggleButton>
                        <ToggleButton value="LOCATION">A plant/location</ToggleButton>
                    </ToggleButtonGroup>

                    {requestType === 'MODULE' ? (
                        <>
                            <TextField
                                select
                                fullWidth
                                label="Module"
                                value={requestModuleKey}
                                onChange={(e) => setRequestModuleKey(e.target.value)}
                                sx={{ mb: 2 }}
                            >
                                {Object.values(MODULE_KEYS).map((key) => (
                                    <MenuItem key={key} value={key}>{MODULE_LABELS[key]}</MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                select
                                fullWidth
                                label="What do you need to do?"
                                value={requestAction}
                                onChange={(e) => setRequestAction(e.target.value)}
                            >
                                <MenuItem value="view">View</MenuItem>
                                <MenuItem value="add">Add</MenuItem>
                                <MenuItem value="edit">Edit</MenuItem>
                            </TextField>
                        </>
                    ) : (
                        <TextField
                            select
                            fullWidth
                            label="Plant / Location"
                            value={requestPlantId}
                            onChange={(e) => setRequestPlantId(e.target.value)}
                        >
                            {allPlants.map((plant) => (
                                <MenuItem key={plant.PlantID} value={plant.PlantID}>
                                    {plant.PlantName || plant.PlantCode}
                                </MenuItem>
                            ))}
                        </TextField>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRequestDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmitAccessRequest}
                        disabled={
                            isSubmittingRequest ||
                            (requestType === 'MODULE' ? !requestModuleKey : !requestPlantId)
                        }
                    >
                        Send Request
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
