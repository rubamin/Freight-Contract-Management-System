import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, TextField, Button, Paper, Grid, Autocomplete, Alert, Divider, IconButton, Tooltip, FormControlLabel, Checkbox, Card 
} from '@mui/material';

import BusinessIcon from '@mui/icons-material/Business';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import FactoryIcon from '@mui/icons-material/Factory';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonPinIcon from '@mui/icons-material/PersonPin';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import api from '../../services/api';

export default function AdminSettings() {
    const [metadata, setMetadata] = useState({ companies: [], sbus: [], plants: [], locations: [], users: [], approvalConfigs: [] });
    const [message, setMessage] = useState({ type: '', text: '' });


    const [formMode, setFormMode] = useState('add');
    const [targetType, setTargetType] = useState('company'); 
    const [activeId, setActiveId] = useState(null);
    const [parentID, setParentID] = useState('');
    const [itemName, setItemName] = useState('');

    const [approvalConfig, setApprovalConfig] = useState({
        locationID: '',
        primaryUserID: '',
        primaryEmail: '',
        optionalUserID: '',
        optionalEmail: '',
        isPrimaryActive: true,
        isOptionalActive: false
    });

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
            let endpoint = '/settings/master';
            let payload = {};

            if (targetType === 'approval') {
                endpoint = '/settings/approval-config';
                payload = approvalConfig;
            } else {
                payload = {
                    type: targetType,
                    name: itemName,
                    parentID: parentID || null,
                    mode: formMode,
                    id: activeId
                };
            }

            const res = await api.post(endpoint, payload);
            if (res.data.success) {
                setMessage({ type: 'success', text: res.data.message });
                setItemName('');
                fetchMetadata();
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Error occurred' });
        }
    };

    return (
        <Box sx={{ p: 4, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b', mb: 3 }}>Settings & Hierarchy</Typography>
            
            {message.text && <Alert severity={message.type} sx={{ mb: 3 }}>{message.text}</Alert>}

            <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
                
                {/* Left Panel: Organization Tree View (Width 40%) */}
                <Box sx={{ width: { xs: '100%', md: '40%' }, flexShrink: 0 }}>
                    <Paper sx={{ p: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#475569' }}>ORGANIZATION TREE</Typography>
                            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => { setTargetType('company'); setFormMode('add'); setItemName(''); }}>Add Company</Button>
                        </Box>
                        
                        <TextField fullWidth size="small" placeholder="Search hierarchy..." sx={{ mb: 3 }} />

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '650px', overflowY: 'auto' }}>
                            {metadata.companies.map(c => (
                                <Box key={c.CompanyID} sx={{ pl: 1, borderLeft: '2px solid #e2e8f0', ml: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <BusinessIcon fontSize="small" color="action" /> {c.CompanyName}
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                            <Tooltip title="Edit Company"><IconButton size="small" onClick={() => { setTargetType('company'); setFormMode('edit'); setActiveId(c.CompanyID); setItemName(c.CompanyName); }}><EditIcon fontSize="small"/></IconButton></Tooltip>
                                            <Button size="small" startIcon={<AddIcon />} onClick={() => { setTargetType('sbu'); setFormMode('add'); setParentID(c.CompanyID); setItemName(''); }}>Add SBU</Button>
                                        </Box>
                                    </Box>

                                    {metadata.sbus.filter(s => s.CompanyID === c.CompanyID).map(s => (
                                        <Box key={s.SBUID} sx={{ pl: 2, borderLeft: '2px solid #e2e8f0', ml: 1, my: 1 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                                                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <AccountTreeIcon fontSize="small" color="action" /> {s.SBUName}
                                                </Typography>
                                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                    <Tooltip title="Edit SBU"><IconButton size="small" onClick={() => { setTargetType('sbu'); setFormMode('edit'); setActiveId(s.SBUID); setItemName(s.SBUName); }}><EditIcon fontSize="small"/></IconButton></Tooltip>
                                                    <Button size="small" startIcon={<AddIcon />} onClick={() => { setTargetType('plant'); setFormMode('add'); setParentID(s.SBUID); setItemName(''); }}>Add Plant</Button>
                                                </Box>
                                            </Box>

                                            {metadata.plants.filter(p => p.SBUID === s.SBUID).map(p => (
                                                <Box key={p.PlantHierarchyID} sx={{ pl: 2, borderLeft: '2px solid #e2e8f0', ml: 1, my: 1 }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5, bgcolor: '#f8fafc', px: 1, borderRadius: 1 }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <FactoryIcon fontSize="small" color="primary" /> {p.PlantName}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                            <Tooltip title="Edit Plant"><IconButton size="small" onClick={() => { setTargetType('plant'); setFormMode('edit'); setActiveId(p.PlantHierarchyID); setItemName(p.PlantName); }}><EditIcon fontSize="small"/></IconButton></Tooltip>
                                                            <Button size="small" startIcon={<AddIcon />} onClick={() => { setTargetType('location'); setFormMode('add'); setParentID(p.PlantHierarchyID); setItemName(''); }}>Add Location</Button>
                                                        </Box>
                                                    </Box>

                                                    {/* Locations under Plant */}
                                                    {metadata.locations.filter(l => l.PlantHierarchyID === p.PlantHierarchyID).map(l => {
                                                        const assignedConfig = metadata.approvalConfigs?.find(ac => ac.LocationID === l.LocationID);
                                                        return (
                                                            <Box key={l.LocationID} sx={{ pl: 2, borderLeft: '2px solid #e2e8f0', ml: 1, my: 1 }}>
                                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, bgcolor: '#f1f5f9', px: 1, borderRadius: 1 }}>
                                                                    <Box>
                                                                        <Typography variant="body2" sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                            <LocationOnIcon fontSize="small" color="error" /> {l.LocationName}
                                                                        </Typography>
                                                                        {assignedConfig && (
                                                                            <Box sx={{ pl: 3, mt: 0.5 }}>
                                                                                {assignedConfig.PrimaryUserID && (
                                                                                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                                                                                        <PersonPinIcon fontSize="small" color={assignedConfig.IsPrimaryActive ? "success" : "disabled"} /> Primary: {assignedConfig.PrimaryUserName} ({assignedConfig.IsPrimaryActive ? 'Active' : 'Inactive'})
                                                                                    </Typography>
                                                                                )}
                                                                                {assignedConfig.OptionalUserID && (
                                                                                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                                                                                        <PersonPinIcon fontSize="small" color={assignedConfig.IsOptionalActive ? "success" : "disabled"} /> Optional: {assignedConfig.OptionalUserName} ({assignedConfig.IsOptionalActive ? 'Active' : 'Inactive'})
                                                                                    </Typography>
                                                                                )}
                                                                            </Box>
                                                                        )}
                                                                    </Box>
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                        <Tooltip title="Edit Location"><IconButton size="small" onClick={() => { setTargetType('location'); setFormMode('edit'); setActiveId(l.LocationID); setItemName(l.LocationName); }}><EditIcon fontSize="small"/></IconButton></Tooltip>
                                                                        <Button 
                                                                            size="small" 
                                                                            color="secondary" 
                                                                            startIcon={<PersonPinIcon />} 
                                                                            onClick={() => { 
                                                                                setTargetType('approval'); 
                                                                                setApprovalConfig({
                                                                                    locationID: l.LocationID,
                                                                                    primaryUserID: assignedConfig?.PrimaryUserID || '',
                                                                                    primaryEmail: assignedConfig?.PrimaryEmail || '',
                                                                                    optionalUserID: assignedConfig?.OptionalUserID || '',
                                                                                    optionalEmail: assignedConfig?.OptionalEmail || '',
                                                                                    isPrimaryActive: assignedConfig ? Boolean(assignedConfig.IsPrimaryActive) : true,
                                                                                    isOptionalActive: assignedConfig ? Boolean(assignedConfig.IsOptionalActive) : false
                                                                                }); 
                                                                            }}
                                                                        >
                                                                            Approvers
                                                                        </Button>
                                                                    </Box>
                                                                </Box>
                                                            </Box>
                                                        );
                                                    })}
                                                </Box>
                                            ))}
                                        </Box>
                                    ))}
                                </Box>
                            ))}
                        </Box>
                    </Paper>
                </Box>

                {/* Right Panel: Contextual Dynamic Form (Width 60%) */}
                <Box sx={{ width: { xs: '100%', md: '60%' }, flexGrow: 1 }}>
                    <Paper sx={{ p: 4, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, textTransform: 'capitalize' }}>
                            {targetType === 'approval' ? 'Configure Responsible Persons For Approval' : `${formMode} ${targetType}`}
                        </Typography>

                        <form onSubmit={handleFormSubmit}>
                            <Grid container spacing={3}>
                                {targetType !== 'approval' ? (
                                    <Grid item xs={12}>
                                        <TextField 
                                            fullWidth 
                                            label={`${targetType.toUpperCase()} Name *`} 
                                            value={itemName} 
                                            onChange={(e) => setItemName(e.target.value)} 
                                            required 
                                        />
                                    </Grid>
                                ) : (
                                    <>
                                        {/* Primary Approver Card Section */}
                                        <Grid item xs={12}>
                                            <Card variant="outlined" sx={{ p: 2, backgroundColor: '#f8fafc' }}>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>Primary Approver</Typography>
                                                <Grid container spacing={2}>
                                                    {/* Row 1: Select User */}
                                                    <Grid item xs={12}>
                                                        <Autocomplete
                                                            options={metadata.users}
                                                            getOptionLabel={(option) => option.FullName}
                                                            value={metadata.users.find(u => u.UserID === approvalConfig.primaryUserID) || null}
                                                            onChange={(event, newValue) => {
                                                                setApprovalConfig({
                                                                    ...approvalConfig,
                                                                    primaryUserID: newValue ? newValue.UserID : '',
                                                                    primaryEmail: newValue ? newValue.Email : ''
                                                                });
                                                            }}
                                                            renderInput={(params) => <TextField {...params} label="Select Primary User" required />}
                                                        />
                                                    </Grid>
                                                    {/* Row 2: Email ID */}
                                                    <Grid item xs={12}>
                                                        <TextField fullWidth label="Primary User Mail ID" value={approvalConfig.primaryEmail} InputProps={{ readOnly: true }} />
                                                    </Grid>
                                                    {/* Row 3: Active Checkbox */}
                                                    <Grid item xs={12}>
                                                        <FormControlLabel 
                                                            control={
                                                                <Checkbox 
                                                                    checked={approvalConfig.isPrimaryActive} 
                                                                    onChange={(e) => setApprovalConfig({...approvalConfig, isPrimaryActive: e.target.checked})} 
                                                                />
                                                            } 
                                                            label="Active for sending mail (Primary)" 
                                                        />
                                                    </Grid>
                                                </Grid>
                                            </Card>
                                        </Grid>

                                        {/* Optional Approver Card Section */}
                                        <Grid item xs={12} sx={{ mt: 1 }}>
                                            <Card variant="outlined" sx={{ p: 2, backgroundColor: '#f8fafc' }}>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>Optional Approver (Optional)</Typography>
                                                <Grid container spacing={2}>
                                                    {/* Row 1: Select User */}
                                                    <Grid item xs={12}>
                                                        <Autocomplete
                                                            options={metadata.users}
                                                            getOptionLabel={(option) => option.FullName}
                                                            value={metadata.users.find(u => u.UserID === approvalConfig.optionalUserID) || null}
                                                            onChange={(event, newValue) => {
                                                                setApprovalConfig({
                                                                    ...approvalConfig,
                                                                    optionalUserID: newValue ? newValue.UserID : '',
                                                                    optionalEmail: newValue ? newValue.Email : ''
                                                                });
                                                            }}
                                                            renderInput={(params) => <TextField {...params} label="Select Optional User" />}
                                                        />
                                                    </Grid>
                                                    {/* Row 2: Email ID */}
                                                    <Grid item xs={12}>
                                                        <TextField fullWidth label="Optional User Mail ID" value={approvalConfig.optionalEmail} InputProps={{ readOnly: true }} />
                                                    </Grid>
                                                    {/* Row 3: Active Checkbox */}
                                                    <Grid item xs={12}>
                                                        <FormControlLabel 
                                                            control={
                                                                <Checkbox 
                                                                    checked={approvalConfig.isOptionalActive} 
                                                                    onChange={(e) => setApprovalConfig({...approvalConfig, isOptionalActive: e.target.checked})} 
                                                                />
                                                            } 
                                                            label="Active for sending mail (Optional)" 
                                                        />
                                                    </Grid>
                                                </Grid>
                                            </Card>
                                        </Grid>
                                    </>
                                )}

                                <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
                                    <Button variant="outlined" color="inherit" onClick={() => { setItemName(''); }}>Cancel</Button>
                                    <Button type="submit" variant="contained" startIcon={<SaveIcon />}>Save Changes</Button>
                                </Grid>
                            </Grid>
                        </form>

                    </Paper>
                </Box>
            </Box>
        </Box>
    );
}

