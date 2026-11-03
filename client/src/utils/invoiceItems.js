// Add Invoice page model: an invoice holds the fields shared by all its
// trips (vendor, GST, invoice no/date, documents, pre-approval, remark)
// and a list of trip items holding only what differs per trip. On save
// every item becomes one invoice row with the shared fields copied in.
import { CONTRACT_TYPES, isAdHocInvoiceType } from "../constants/contractTypes";
import { DOCUMENT_FIELDS } from "../constants/addInvoice";
import { MIN_FREIGHT_CHARGE_MESSAGE, isFreightChargeTooLow } from "../constants/invoiceRules";
import { isCustomerNameRequired, optionalWeightValue } from "./invoiceValidation";

let lastLocalId = 0;
// Ids only need to be unique within the page (React keys, active field).
export const nextLocalId = () => {
  lastLocalId += 1;
  return lastLocalId;
};

const BASE_CHARGE_FIELDS = ["freightCharge", "detainCharge", "extraCharge"];
// Above this an "MT" weight is taken as KG and converted.
const KG_ENTERED_AS_MT_THRESHOLD = 1000;

export const createEmptyItem = () => ({
  id: nextLocalId(),
  lrDate: "",
  lrNo: "",
  // Sales Order number of the trip (optional).
  soNumber: "",
  vehicleType: "",
  vehicleTypeId: "",
  to: "",
  actualWeightMT: "",
  freightCharge: "",
  detainCharge: "0",
  extraCharge: "0",
  // Per contract type fields - only the ones of the chosen type are shown
  // (see INVOICE_TYPE_CONFIG) and sent.
  packages: "",
  chargedWeight: "",
  billedRate: "",
  docketCharge: "0",
  odaCategory: "",
  odaCharge: "0",
  fovCharge: "0",
  loadingCharge: "0",
  otherCharge: "0",
  customerName: "",
  total: 0,
});

export const createEmptyInvoice = () => ({
  id: nextLocalId(),
  vendorId: null,
  vendorName: "",
  gstNo: "",
  vendorGstId: null,
  invoiceBillNo: "",
  invoiceBillDate: "",
  isPreApproved: false,
  // Approver picked by the uploader (e.g. HOD) - see the location workflow.
  approverUserId: null,
  userRemarks: "",
  supportingDoc1: null,
  supportingDoc2: null,
  supportingDoc3: null,
  items: [createEmptyItem()],
});

const roundAmount = (value) => Math.round(value * 100) / 100;

// Item total = freight + detain + extra + the charge fields of the type.
const calculateItemTotal = (item, typeConfig) => {
  const chargeFields = [...BASE_CHARGE_FIELDS, ...typeConfig.extraFields.filter((f) => f.isCharge).map((f) => f.field)];
  return roundAmount(chargeFields.reduce((sum, key) => sum + (parseFloat(item[key]) || 0), 0));
};

// Freight = rate x (charged weight, else actual weight) once both are known.
const calculateFreightFromRate = (item) => {
  const rate = parseFloat(item.billedRate);
  const weight = parseFloat(item.chargedWeight) || parseFloat(item.actualWeightMT);
  return rate > 0 && weight > 0 ? roundAmount(rate * weight).toString() : item.freightCharge;
};

const normalizeMtWeight = (value) => {
  const numeric = parseFloat(value) || 0;
  return numeric > KG_ENTERED_AS_MT_THRESHOLD ? (numeric / 1000).toFixed(2) : value;
};

// Applies one field change to a trip item, then re-derives freight (rate
// based types) and the item total.
export const applyItemChange = (item, field, value, typeConfig) => {
  const next = { ...item, [field]: value };
  if (field === "actualWeightMT" && !typeConfig.weightInKg) {
    next.actualWeightMT = normalizeMtWeight(value);
  }
  const hasRateField = typeConfig.extraFields.some((f) => f.role === "rate");
  if (hasRateField && ["billedRate", "chargedWeight", "actualWeightMT"].includes(field)) {
    next.freightCharge = calculateFreightFromRate(next);
  }
  next.total = calculateItemTotal(next, typeConfig);
  return next;
};

export const getInvoiceTotal = (invoice) => roundAmount(invoice.items.reduce((sum, item) => sum + (item.total || 0), 0));

export const hasSupportingDocument = (invoice) => DOCUMENT_FIELDS.some(({ field }) => Boolean(invoice[field]));

// True when nothing has been typed on the invoice yet.
export const isInvoiceBlank = (invoice) => {
  const blankItem = createEmptyItem();
  const itemIsBlank = (item) =>
    Object.keys(blankItem).every((key) => key === "id" || key === "total" || String(item[key] ?? "") === String(blankItem[key]));
  return !invoice.vendorId && !invoice.invoiceBillNo.trim() && !invoice.invoiceBillDate
    && !invoice.userRemarks.trim() && !invoice.isPreApproved && !hasSupportingDocument(invoice)
    && invoice.items.every(itemIsBlank);
};

export const isInvoiceFilled = (invoice) => invoice.invoiceBillNo.trim() !== "";

const optionalNumber = (value) => (value === "" || value === null || value === undefined ? null : parseFloat(value));

// Payload fields of the non FTL Outbound types (FTL Outbound sends none).
const buildTypePayload = (item, contractType) => {
  if (contractType === CONTRACT_TYPES.FTL_OUTBOUND) return {};
  return {
    contractType,
    packages: item.packages === "" ? null : parseInt(item.packages, 10),
    chargedWeight: optionalNumber(item.chargedWeight),
    billedRate: optionalNumber(item.billedRate),
    docketCharge: parseFloat(item.docketCharge) || 0,
    odaCategory: item.odaCategory || null,
    odaCharge: parseFloat(item.odaCharge) || 0,
    fovCharge: parseFloat(item.fovCharge) || 0,
    loadingCharge: parseFloat(item.loadingCharge) || 0,
    otherCharge: parseFloat(item.otherCharge) || 0,
  };
};

// One API row per trip item. docGroup tells the server which uploaded
// documents (doc1_<docGroup>, ...) belong to the row's invoice.
export const buildPayloadRows = ({ invoices, contractType, location, normalizeDate }) =>
  invoices.flatMap((invoice, invoiceIndex) =>
    invoice.items.map((item) => ({
      ...location,
      docGroup: invoiceIndex,
      vendorId: invoice.vendorId,
      vendorName: invoice.vendorName,
      gstNo: invoice.gstNo,
      vendorGstId: invoice.vendorGstId,
      invoiceNo: invoice.invoiceBillNo.trim(),
      invoiceDate: normalizeDate(invoice.invoiceBillDate, true),
      preAppr: invoice.isPreApproved ? "Yes" : "No",
      approverUserId: invoice.approverUserId || null,
      userRemarks: invoice.userRemarks,
      customerName: item.customerName,
      lrDate: normalizeDate(item.lrDate, true),
      lrNo: item.lrNo,
      soNumber: String(item.soNumber || "").trim(),
      vehicleType: item.vehicleType,
      vehicleTypeId: item.vehicleTypeId || null,
      toStation: item.to,
      actualWeight: optionalWeightValue(item.actualWeightMT),
      freightCharge: parseFloat(item.freightCharge) || 0,
      detainCharge: parseFloat(item.detainCharge) || 0,
      extraCharge: parseFloat(item.extraCharge) || 0,
      total: item.total,
      ...buildTypePayload(item, contractType),
    }))
  );

// Vehicle Type is mandatory for every type whose rate depends on it.
export const isVehicleTypeMissing = (item, typeConfig) =>
  typeConfig.showVehicleType && typeConfig.vehicleTypeRequired !== false && !String(item.vehicleType || "").trim();

// An Ad-Hoc invoice has no contract and a pre-approved one skips the
// audit, so both need at least one supporting document.
export const isSupportingDocumentRequired = (invoice, contractType) =>
  invoice.isPreApproved || isAdHocInvoiceType(contractType);

const describeItem = (invoice, invoiceIndex, itemIndex) =>
  `Invoice #${invoiceIndex + 1} (${invoice.invoiceBillNo || "no number"}), Trip ${itemIndex + 1}`;

// Item level rules, in the order the user should fix them.
const ITEM_RULES = [
  {
    fails: ({ item, typeConfig }) => isVehicleTypeMissing(item, typeConfig),
    message: () => "Vehicle Type is required.",
  },
  {
    fails: ({ item, typeConfig }) => typeConfig.weightRequired && !(parseFloat(item.actualWeightMT) > 0),
    message: ({ typeConfig }) => `${typeConfig.weightLabel.replace(" *", "")} is required.`,
  },
  {
    fails: ({ item, contractType }) => contractType !== CONTRACT_TYPES.FTL_OUTBOUND && !String(item.to || "").trim(),
    message: ({ typeConfig }) => `${typeConfig.cityLabel.replace(" *", "")} is required.`,
  },
  {
    fails: ({ item, invoice, typeConfig, contractType, getContractEntry, isOutsideContract }) =>
      typeConfig.citySelectOnly && isOutsideContract(getContractEntry(invoice.vendorId, contractType), item.to),
    message: ({ item, invoice, typeConfig }) =>
      `${typeConfig.cityLabel.replace(" *", "")} '${item.to}' is not in the active contract of ${invoice.vendorName || "the selected vendor"}.`,
  },
  {
    fails: ({ item }) => isFreightChargeTooLow(item.freightCharge),
    message: () => MIN_FREIGHT_CHARGE_MESSAGE,
  },
  {
    fails: ({ item }) => isCustomerNameRequired(item),
    message: ({ partyLabel }) => `${partyLabel} Name is required when Detain Charge or Extra Charge is entered.`,
  },
];

// Returns the first problem on the filled invoices, or null when they
// can be saved.
export const findInvoiceValidationError = (context) => {
  const filledInvoices = context.invoices.filter(isInvoiceFilled);
  if (filledInvoices.length === 0) return "Please enter at least one invoice with an Invoice / Bill No.";

  for (let invoiceIndex = 0; invoiceIndex < context.invoices.length; invoiceIndex += 1) {
    const invoice = context.invoices[invoiceIndex];
    if (!isInvoiceFilled(invoice)) continue;
    if (!invoice.vendorId || !invoice.gstNo) {
      return `Invoice #${invoiceIndex + 1}: Vendor and GST No are required.`;
    }
    if (isSupportingDocumentRequired(invoice, context.contractType) && !hasSupportingDocument(invoice)) {
      const reason = isAdHocInvoiceType(context.contractType) ? "an Ad-Hoc" : "a Pre-Approved";
      return `Invoice #${invoiceIndex + 1}: attach at least one supporting document for ${reason} invoice.`;
    }
    if (context.approverStep && !invoice.approverUserId) {
      return `Invoice #${invoiceIndex + 1}: select the ${context.approverStep.stepName} approver.`;
    }
    for (let itemIndex = 0; itemIndex < invoice.items.length; itemIndex += 1) {
      const ruleContext = { ...context, invoice, item: invoice.items[itemIndex] };
      const failedRule = ITEM_RULES.find((rule) => rule.fails(ruleContext));
      if (failedRule) return `${describeItem(invoice, invoiceIndex, itemIndex)}: ${failedRule.message(ruleContext)}`;
    }
  }
  return null;
};
