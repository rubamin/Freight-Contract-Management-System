import React from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { Delete as DeleteIcon, SaveAs as SaveAsIcon } from '@mui/icons-material';

// Asked before an invoice is taken off the Add Invoice page: remove it for
// good, or keep it as a draft that can be resumed later.
export default function RemoveInvoiceDialog({ open, invoiceLabel, canSaveDraft, saving, onCancel, onRemove, onSaveDraft }) {
    return (
        <Dialog open={open} onClose={saving ? undefined : onCancel} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ fontWeight: 700 }}>Remove {invoiceLabel}?</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Do you want to remove this invoice from the page, or save it as a draft so you can finish it later?
                    {!canSaveDraft && ' This invoice is empty, so there is nothing to save as a draft.'}
                </DialogContentText>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                <Button onClick={onCancel} disabled={saving} sx={{ textTransform: 'none' }}>Cancel</Button>
                <Button
                    variant="outlined"
                    startIcon={<SaveAsIcon />}
                    onClick={onSaveDraft}
                    disabled={!canSaveDraft || saving}
                    sx={{ textTransform: 'none' }}
                >
                    {saving ? 'Saving...' : 'Save as Draft'}
                </Button>
                <Button variant="contained" color="error" startIcon={<DeleteIcon />} onClick={onRemove} disabled={saving} sx={{ textTransform: 'none' }}>
                    Remove
                </Button>
            </DialogActions>
        </Dialog>
    );
}
