import React, { useEffect, useState } from 'react';
import {
    Alert,
    Autocomplete,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Typography,
} from '@mui/material';
import { Share as ShareIcon } from '@mui/icons-material';
import { getDraftShareCandidates, shareInvoiceDraft } from '../../services/invoiceDraftService';
import { MAX_SHARE_COMMENT_LENGTH } from '../../constants/invoiceDrafts';

const userLabel = (user) => [user.FullName, user.RoleName ? `(${user.RoleName})` : '', user.Email ? `- ${user.Email}` : ''].filter(Boolean).join(' ');

// Asked right after a draft is saved with "Save & Share": pick the users
// to share it with and a comment. Each picked user gets a mail with the
// comment and can then open, edit and submit the draft.
export default function ShareDraftDialog({ open, draftId, onClose, onShared }) {
    const [candidates, setCandidates] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [sharing, setSharing] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open || !draftId) return undefined;
        let isMounted = true;
        setSelectedUsers([]);
        setComment('');
        setError('');
        setLoading(true);
        getDraftShareCandidates(draftId)
            .then((users) => { if (isMounted) setCandidates(users); })
            .catch((loadError) => { if (isMounted) setError(loadError?.response?.data?.message || 'Could not load the users.'); })
            .finally(() => { if (isMounted) setLoading(false); });
        return () => { isMounted = false; };
    }, [open, draftId]);

    const handleShare = async () => {
        setSharing(true);
        setError('');
        try {
            const response = await shareInvoiceDraft(draftId, { userIds: selectedUsers.map((user) => user.UserID), comment: comment.trim() });
            onShared(response.data?.message || 'Draft shared.');
        } catch (shareError) {
            setError(shareError?.response?.data?.message || 'Failed to share the draft.');
        } finally {
            setSharing(false);
        }
    };

    return (
        <Dialog open={open} onClose={sharing ? undefined : onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 700 }}>Do you want to share this invoice?</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    The draft is saved. Pick the user(s) to share it with - they get an email with your comment and can edit, save and submit the draft.
                    Only users who can access this invoice location are listed.
                </Typography>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <Autocomplete
                    multiple
                    options={candidates}
                    loading={loading}
                    value={selectedUsers}
                    onChange={(e, users) => setSelectedUsers(users)}
                    getOptionLabel={userLabel}
                    isOptionEqualToValue={(option, value) => Number(option.UserID) === Number(value.UserID)}
                    noOptionsText={loading ? 'Loading users...' : 'No other user can access this location.'}
                    renderInput={(params) => <TextField {...params} label="Share with *" placeholder="Search user..." size="small" />}
                    sx={{ mb: 2 }}
                />
                <TextField
                    label="Comment"
                    placeholder="e.g. Please check the freight charge and add the LR copy."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    multiline
                    minRows={3}
                    fullWidth
                    size="small"
                    slotProps={{ htmlInput: { maxLength: MAX_SHARE_COMMENT_LENGTH } }}
                    helperText={`${comment.length}/${MAX_SHARE_COMMENT_LENGTH}`}
                />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} disabled={sharing} sx={{ textTransform: 'none' }}>No, keep it with me</Button>
                <Button
                    variant="contained"
                    startIcon={<ShareIcon />}
                    onClick={handleShare}
                    disabled={sharing || selectedUsers.length === 0}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                    {sharing ? 'Sharing...' : 'Share'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
