import React from 'react';
import { Box, Button, Card, CardContent, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import { Delete as DeleteIcon, PlayArrow as ResumeIcon, Share as ShareIcon } from '@mui/icons-material';
import { getContractTypeLabel } from '../../constants/contractTypes';
import { DRAFT_TYPES, DRAFT_TYPE_LABELS } from '../../constants/invoiceDrafts';

const formatDraftTime = (value) =>
    new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const describeSaved = (draft) => {
    const savedAt = formatDraftTime(draft.UpdatedAt || draft.CreatedAt);
    return draft.LastEditedByName ? `saved ${savedAt} by ${draft.LastEditedByName}` : `saved ${savedAt}`;
};

// Who shared a draft with you and their comment, or who you shared yours with.
const ShareInfo = ({ draft }) => {
    if (draft.SharedWithMe) {
        return (
            <Box sx={{ mt: 0.75, px: 1, py: 0.5, borderLeft: '3px solid #2563eb', backgroundColor: '#eff6ff', borderRadius: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#1e3a8a' }}>
                    Shared by {draft.SharedWithMe.SharedByName || draft.OwnerName}
                </Typography>
                {draft.SharedWithMe.Comment && (
                    <Typography variant="caption" component="div" sx={{ color: '#374151', whiteSpace: 'pre-wrap' }}>
                        {draft.SharedWithMe.Comment}
                    </Typography>
                )}
            </Box>
        );
    }
    if (!draft.SharedWith?.length) return null;
    return (
        <Typography variant="caption" component="div" sx={{ mt: 0.5, color: '#2563eb' }}>
            <ShareIcon sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
            Shared with {draft.SharedWith.join(', ')}
        </Typography>
    );
};

// The user's own Add / Edit Invoice drafts and the ones shared with them,
// newest first. Only the owner can delete a draft from here.
export default function InvoiceDraftsPanel({ drafts, busyDraftId, onResume, onDelete, sx }) {
    if (drafts.length === 0) return null;

    return (
        <Card variant="outlined" sx={{ borderRadius: 3, backgroundColor: '#ffffff', border: '1px solid #e5e7eb', maxWidth: 760, mx: 'auto', mb: 2, ...sx }}>
            <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#111827', mb: 1.5 }}>
                    Saved Drafts ({drafts.length})
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {drafts.map((draft) => (
                        <Box key={draft.DraftID} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, p: 1.25, border: '1px solid #e5e7eb', borderRadius: 2 }}>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{draft.Title}</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                                    <Chip size="small" color={draft.DraftType === DRAFT_TYPES.EDIT ? 'warning' : 'primary'} label={DRAFT_TYPE_LABELS[draft.DraftType] || DRAFT_TYPE_LABELS[DRAFT_TYPES.ADD]} />
                                    {draft.ContractType && <Chip size="small" variant="outlined" color="success" label={getContractTypeLabel(draft.ContractType)} />}
                                    <Typography variant="caption" color="text.secondary">
                                        {draft.InvoiceCount} invoice(s) · {describeSaved(draft)}
                                    </Typography>
                                </Box>
                                <ShareInfo draft={draft} />
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                                <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<ResumeIcon />}
                                    onClick={() => onResume(draft)}
                                    disabled={Boolean(busyDraftId)}
                                    sx={{ textTransform: 'none', backgroundColor: '#107c41', '&:hover': { backgroundColor: '#0b5c31' }, boxShadow: 'none' }}
                                >
                                    {busyDraftId === draft.DraftID ? 'Opening...' : 'Resume'}
                                </Button>
                                {draft.IsOwner && (
                                    <Tooltip title="Delete draft">
                                        <span>
                                            <IconButton size="small" color="error" onClick={() => onDelete(draft.DraftID)} disabled={Boolean(busyDraftId)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                )}
                            </Box>
                        </Box>
                    ))}
                </Box>
            </CardContent>
        </Card>
    );
}
