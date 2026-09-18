import React, { useState, useRef } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Avatar,
    Button,
    TextField,
    Grid,
    Divider,
    Chip,
    IconButton,
    Alert,
    Snackbar,
} from '@mui/material';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import SaveIcon from '@mui/icons-material/Save';
import LockResetIcon from '@mui/icons-material/LockReset';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProfile } from '../../redux/slices/authSlice';
import * as userService from '../../services/userService';
import { SERVER_ORIGIN } from '../../constants/appConfig';

const buildPhotoUrl = (relativePath) => {
    if (!relativePath) return null;
    return `${SERVER_ORIGIN}/${relativePath.replace(/\\/g, '/')}`;
};

export default function Profile() {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        FullName: user?.FullName || '',
        Email: user?.Email || '',
    });
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState(buildPhotoUrl(user?.ProfilePhotoUrl));
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
    });
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const showSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleFieldChange = (field) => (e) => {
        setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };

    const handlePhotoSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setPhotoFile(file);
        setPhotoPreviewUrl(URL.createObjectURL(file));
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setIsSavingProfile(true);

        try {
            let payload;

            if (photoFile) {
                payload = new FormData();
                payload.append('FullName', formData.FullName);
                payload.append('Email', formData.Email);
                payload.append('profilePhoto', photoFile);
            } else {
                payload = formData;
            }

            await userService.updateProfile(payload);
            await dispatch(fetchProfile());

            setPhotoFile(null);
            showSnackbar('Profile updated successfully.');
        } catch (err) {
            const message = err.response?.data?.errors?.join(', ') || err.response?.data?.message || 'Failed to update profile.';
            showSnackbar(message, 'error');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handlePasswordFieldChange = (field) => (e) => {
        setPasswordForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();

        if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
            showSnackbar('New password and confirmation do not match.', 'error');
            return;
        }

        setIsChangingPassword(true);
        try {
            await userService.changePassword({
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword,
            });

            setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
            showSnackbar('Password changed successfully.');
        } catch (err) {
            const message = err.response?.data?.errors?.join(', ') || err.response?.data?.message || 'Failed to change password.';
            showSnackbar(message, 'error');
        } finally {
            setIsChangingPassword(false);
        }
    };

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>My Profile</Typography>

            {/* --- PROFILE DETAILS CARD --- */}
            <Card sx={{ mb: 3 }}>
                <CardContent sx={{ p: 4 }}>
                    <form onSubmit={handleSaveProfile}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
                            <Box sx={{ position: 'relative' }}>
                                <Avatar
                                    src={photoPreviewUrl || undefined}
                                    sx={{ width: 96, height: 96, bgcolor: 'primary.main', fontSize: 32 }}
                                >
                                    {formData.FullName ? formData.FullName.charAt(0).toUpperCase() : 'U'}
                                </Avatar>
                                <IconButton
                                    size="small"
                                    onClick={() => fileInputRef.current?.click()}
                                    sx={{
                                        position: 'absolute',
                                        bottom: -4,
                                        right: -4,
                                        bgcolor: 'background.paper',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                                        '&:hover': { bgcolor: 'action.hover' },
                                    }}
                                >
                                    <PhotoCamera fontSize="small" />
                                </IconButton>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    hidden
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={handlePhotoSelect}
                                />
                            </Box>

                            <Box>
                                <Typography variant="subtitle1" fontWeight={600}>
                                    {user?.FullName || 'User'}
                                </Typography>
                                <Chip
                                    label={user?.role?.RoleName || 'No role assigned'}
                                    size="small"
                                    sx={{ mt: 0.5 }}
                                />
                            </Box>
                        </Box>

                        <Divider sx={{ mb: 3 }} />

                        <Grid container spacing={3}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Full Name"
                                    value={formData.FullName}
                                    onChange={handleFieldChange('FullName')}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="email"
                                    label="Email Address"
                                    value={formData.Email}
                                    onChange={handleFieldChange('Email')}
                                    required
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Role"
                                    value={user?.role?.RoleName || '-'}
                                    InputProps={{ readOnly: true }}
                                    helperText="Role is managed by an administrator."
                                />
                            </Grid>
                        </Grid>

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                            <Button
                                type="submit"
                                variant="contained"
                                startIcon={<SaveIcon />}
                                disabled={isSavingProfile}
                            >
                                {isSavingProfile ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </Box>
                    </form>
                </CardContent>
            </Card>

            {/* --- CHANGE PASSWORD CARD --- */}
            <Card>
                <CardContent sx={{ p: 4 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Change Password</Typography>

                    <form onSubmit={handleChangePassword}>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    type="password"
                                    label="Current Password"
                                    value={passwordForm.currentPassword}
                                    onChange={handlePasswordFieldChange('currentPassword')}
                                    required
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="password"
                                    label="New Password"
                                    value={passwordForm.newPassword}
                                    onChange={handlePasswordFieldChange('newPassword')}
                                    required
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="password"
                                    label="Confirm New Password"
                                    value={passwordForm.confirmNewPassword}
                                    onChange={handlePasswordFieldChange('confirmNewPassword')}
                                    required
                                />
                            </Grid>
                        </Grid>

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                            <Button
                                type="submit"
                                variant="contained"
                                color="warning"
                                startIcon={<LockResetIcon />}
                                disabled={isChangingPassword}
                            >
                                {isChangingPassword ? 'Updating...' : 'Change Password'}
                            </Button>
                        </Box>
                    </form>
                </CardContent>
            </Card>

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
