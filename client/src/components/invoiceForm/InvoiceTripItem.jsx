import React from 'react';
import { Box, Chip, IconButton, MenuItem, Select, TextField, Tooltip, Typography } from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { parseDateForApi, toDayjsValue, DISPLAY_DATE_FORMAT } from '../../utils/dateFormat';
import { hasAdditionalCharges } from '../../utils/invoiceValidation';
import { isVehicleTypeMissing } from '../../utils/invoiceItems';
import { MAX_SO_NUMBER_LENGTH, MIN_FREIGHT_CHARGE, MIN_FREIGHT_CHARGE_MESSAGE, SO_NUMBER_LABEL, isFreightChargeTooLow } from '../../constants/invoiceRules';
import { EditableAutocompleteCell, InvoiceField } from './InvoiceFormFields';
import { CELL_INPUT_STYLE, getInvoiceFieldGridSx } from './invoiceFormStyles';

const TEXT_SLOT_PROPS = { input: { disableUnderline: true }, htmlInput: { style: CELL_INPUT_STYLE } };
const DATE_SLOT_PROPS = {
    textField: { size: 'small', fullWidth: true, variant: 'standard', slotProps: { input: { disableUnderline: true }, inputLabel: { shrink: true }, htmlInput: { style: CELL_INPUT_STYLE } } }
};

const TextCell = ({ value, onChange, placeholder, type = 'text', step, maxLength }) => (
    <TextField
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        size="small"
        fullWidth
        variant="standard"
        slotProps={{ ...TEXT_SLOT_PROPS, htmlInput: { ...TEXT_SLOT_PROPS.htmlInput, step, maxLength } }}
    />
);

const SelectCell = ({ value, onChange, emptyLabel, options, emptyDisabled = false }) => (
    <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        displayEmpty
        size="small"
        fullWidth
        variant="standard"
        disableUnderline
        sx={{ fontSize: '0.82rem', '& .MuiSelect-select': { py: 0.5, px: 1 } }}
    >
        <MenuItem value="" disabled={emptyDisabled} sx={{ fontSize: '0.82rem' }}>{emptyLabel}</MenuItem>
        {options.map((option) => (
            <MenuItem key={option} value={option} sx={{ fontSize: '0.82rem' }}>{option}</MenuItem>
        ))}
    </Select>
);

// One trip (LR) of an invoice: only the values that differ between trips.
// Vendor, invoice no/date, documents and remarks live on the invoice.
export default function InvoiceTripItem({
    item,
    index,
    canRemove,
    typeConfig,
    partyLabel,
    partyOptions,
    vehicleTypes,
    destinationOptions,
    destinationPlaceholder,
    showErrors,
    isSidebarCollapsed,
    onChange,
    onPartyChange,
    onRemove,
    onActivate,
}) {
    const activate = (field) => () => onActivate(field);
    const change = (field) => (value) => onChange(field, value);
    const freightTooLow = item.freightCharge !== '' && isFreightChargeTooLow(item.freightCharge);
    const partyRequired = hasAdditionalCharges(item);
    const shipmentFields = typeConfig.extraFields.filter((f) => !f.isCharge);
    const chargeFields = typeConfig.extraFields.filter((f) => f.isCharge);
    const vehicleTypeRequired = typeConfig.vehicleTypeRequired !== false;

    const renderExtraField = (f) => (
        <InvoiceField key={f.field} label={f.label} onActivate={activate(f.field)}>
            {f.kind === 'select' ? (
                <SelectCell value={item[f.field]} onChange={change(f.field)} emptyLabel="None" options={f.options} />
            ) : (
                <TextCell type="number" value={item[f.field]} onChange={change(f.field)} placeholder="0" step={f.kind === 'integer' ? 1 : 'any'} />
            )}
        </InvoiceField>
    );

    return (
        <Box sx={{ border: '1px dashed #cbd5e1', borderRadius: 1.5, p: 1, backgroundColor: '#fcfdfc' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#107c41' }}>TRIP {index + 1}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip size="small" label={`₹ ${item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} sx={{ fontWeight: 700, color: '#137333', backgroundColor: '#e6f4ea' }} />
                    <Tooltip title={canRemove ? 'Remove this trip' : 'An invoice needs at least one trip'}>
                        <span>
                            <IconButton size="small" color="error" onClick={onRemove} disabled={!canRemove}><DeleteIcon fontSize="small" /></IconButton>
                        </span>
                    </Tooltip>
                </Box>
            </Box>

            <Box sx={getInvoiceFieldGridSx(isSidebarCollapsed)}>
                <InvoiceField label="LR Date *" onActivate={activate('lrDate')}>
                    <DatePicker
                        value={toDayjsValue(item.lrDate)}
                        onChange={(newValue) => onChange('lrDate', parseDateForApi(newValue))}
                        format={DISPLAY_DATE_FORMAT}
                        slotProps={DATE_SLOT_PROPS}
                    />
                </InvoiceField>
                <InvoiceField label="LR NO *" onActivate={activate('lrNo')}>
                    <TextCell value={item.lrNo} onChange={change('lrNo')} placeholder="LR No" />
                </InvoiceField>
                <InvoiceField label={SO_NUMBER_LABEL} onActivate={activate('soNumber')}>
                    <TextCell value={item.soNumber ?? ''} onChange={change('soNumber')} placeholder="SO No (optional)" maxLength={MAX_SO_NUMBER_LENGTH} />
                </InvoiceField>

                {typeConfig.showVehicleType && (
                    <InvoiceField label={vehicleTypeRequired ? 'Vehicle Type *' : 'Vehicle Type'} onActivate={activate('vehicleType')} error={showErrors && isVehicleTypeMissing(item, typeConfig)}>
                        <SelectCell value={item.vehicleType} onChange={change('vehicleType')} emptyLabel="-- Select Vehicle Type --" options={vehicleTypes} emptyDisabled={vehicleTypeRequired} />
                    </InvoiceField>
                )}

                {/* City - only the destinations of the vendor's active contract */}
                <InvoiceField label={typeConfig.cityLabel} onActivate={activate('to')}>
                    <EditableAutocompleteCell
                        value={item.to}
                        options={destinationOptions}
                        placeholder={destinationPlaceholder}
                        onChange={change('to')}
                        freeSolo={!typeConfig.citySelectOnly}
                    />
                </InvoiceField>

                <InvoiceField label={typeConfig.weightLabel} onActivate={activate('actualWeightMT')}>
                    <TextCell type="number" value={item.actualWeightMT} onChange={change('actualWeightMT')} placeholder={typeConfig.weightInKg ? '0 KG' : '0.00 MT'} />
                </InvoiceField>

                {shipmentFields.map(renderExtraField)}

                <InvoiceField label="Basic Freight Chg" onActivate={activate('freightCharge')} error={freightTooLow}>
                    <TextField
                        type="number"
                        value={item.freightCharge}
                        onChange={(e) => onChange('freightCharge', e.target.value)}
                        placeholder={`Min ${MIN_FREIGHT_CHARGE}`}
                        size="small"
                        fullWidth
                        variant="standard"
                        title={MIN_FREIGHT_CHARGE_MESSAGE}
                        slotProps={{ input: { disableUnderline: true, sx: freightTooLow ? { color: 'error.main' } : undefined }, htmlInput: { style: CELL_INPUT_STYLE, min: MIN_FREIGHT_CHARGE } }}
                    />
                </InvoiceField>
                <InvoiceField label="Detain Chg" onActivate={activate('detainCharge')}>
                    <TextCell type="number" value={item.detainCharge} onChange={change('detainCharge')} placeholder="0" />
                </InvoiceField>
                <InvoiceField label="Extra Chg" onActivate={activate('extraCharge')}>
                    <TextCell type="number" value={item.extraCharge} onChange={change('extraCharge')} placeholder="0" />
                </InvoiceField>

                {chargeFields.map(renderExtraField)}

                <InvoiceField
                    label={partyRequired ? `${partyLabel} Name *` : `${partyLabel} Name (required if charges)`}
                    onActivate={activate('customerName')}
                    error={showErrors && partyRequired && !String(item.customerName || '').trim()}
                >
                    <EditableAutocompleteCell
                        value={item.customerName}
                        options={partyOptions}
                        placeholder={partyRequired ? `${partyLabel} Name (required)` : `${partyLabel} Name (optional)`}
                        required={partyRequired}
                        onChange={onPartyChange}
                    />
                </InvoiceField>
            </Box>
        </Box>
    );
}
