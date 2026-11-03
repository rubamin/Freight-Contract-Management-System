import React from 'react';
import { Autocomplete, Box, TextField, Typography } from '@mui/material';
import { CELL_INPUT_STYLE } from './invoiceFormStyles';

// Building blocks shared by the Add Invoice and Edit Invoice card layouts.

const BORDER_COLOR = '#d1d5db';
const ERROR_COLOR = '#d32f2f';
const FOCUS_COLOR = '#107c41';

// freeSolo defaults to true (typing a new value is allowed). Pass
// freeSolo={false} for fields that only accept a listed option.
export const EditableAutocompleteCell = ({ value, options, placeholder, onChange, freeSolo = true, required = false }) => (
    <Autocomplete
        freeSolo={freeSolo}
        options={options}
        value={value || ''}
        onChange={(e, val) => onChange(val || '')}
        onInputChange={(e, val) => {
            // Select-only fields commit through onChange when an option is picked.
            if (freeSolo) onChange(val || '');
        }}
        renderInput={(params) => (
            <TextField
                {...params}
                placeholder={placeholder}
                required={required}
                size="small"
                variant="standard"
                InputProps={{ ...params.InputProps, disableUnderline: true }}
                inputProps={{ ...params.inputProps, style: CELL_INPUT_STYLE }}
            />
        )}
    />
);

// One labelled input of an invoice card. Clicking or focusing it reports
// the field as active. `error` outlines it red (missing mandatory value).
// `hint` is shown under the input (e.g. allowed upload types and size).
export const InvoiceField = ({ label, onActivate, error = false, hint = null, children }) => (
    <Box onClick={onActivate} onFocusCapture={onActivate} sx={{ minWidth: 0 }}>
        <Typography variant="caption" sx={{ display: 'block', mb: 0.25, fontWeight: 700, color: error ? ERROR_COLOR : '#374151', lineHeight: 1.3 }}>
            {label}
        </Typography>
        <Box
            sx={{
                minHeight: 34,
                display: 'flex',
                alignItems: 'center',
                px: 0.5,
                border: `1px solid ${error ? ERROR_COLOR : BORDER_COLOR}`,
                borderRadius: 1.5,
                backgroundColor: '#ffffff',
                '& > *': { flex: 1, minWidth: 0 },
                '&:focus-within': { borderColor: FOCUS_COLOR, boxShadow: '0 0 0 2px rgba(16, 124, 65, 0.15)' }
            }}
        >
            {children}
        </Box>
        {hint}
    </Box>
);

// Section title spanning the full width of the field grid.
export const InvoiceSectionTitle = ({ children }) => (
    <Typography
        variant="overline"
        sx={{ gridColumn: '1 / -1', fontWeight: 800, fontSize: '0.68rem', color: FOCUS_COLOR, letterSpacing: 0.6, lineHeight: 1.4, borderBottom: '1px dashed #e5e7eb' }}
    >
        {children}
    </Typography>
);

// Read-only text shown inside an InvoiceField (e.g. system remarks).
export const ReadOnlyFieldText = ({ children }) => (
    <Typography variant="body2" sx={{ ...CELL_INPUT_STYLE, color: '#6b7280', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {children || '-'}
    </Typography>
);
