// Converts the Add / Edit Invoice page to a saveable draft and back. File
// objects cannot travel inside JSON, so each attachment is replaced with a
// key and uploaded next to the draft; restoring downloads it back into a File.
import { DOCUMENT_FIELDS } from "../constants/addInvoice";
import { getContractTypeLabel } from "../constants/contractTypes";
import { DRAFT_TYPES } from "../constants/invoiceDrafts";
import { nextLocalId } from "./invoiceItems";

const MAX_TITLE_INVOICE_NUMBERS = 3;

const draftFileKey = (invoiceIndex, field) => `inv${invoiceIndex}_${field}`;

const stripInvoice = (invoice, invoiceIndex, files) => {
  const plain = { ...invoice };
  DOCUMENT_FIELDS.forEach(({ field }) => {
    if (!invoice[field]) return;
    const key = draftFileKey(invoiceIndex, field);
    files.push({ key, file: invoice[field] });
    plain[field] = { draftFileKey: key };
  });
  return plain;
};

const describeInvoiceNumbers = (invoiceNumbers) => {
  const numbers = [...new Set(invoiceNumbers.map((number) => String(number || "").trim()).filter(Boolean))];
  const shown = numbers.slice(0, MAX_TITLE_INVOICE_NUMBERS).join(", ");
  const more = numbers.length > MAX_TITLE_INVOICE_NUMBERS ? ` +${numbers.length - MAX_TITLE_INVOICE_NUMBERS}` : "";
  return shown ? `${shown}${more}` : "no invoice no yet";
};

export const buildDraftTitle = (contractType, invoices) =>
  `${getContractTypeLabel(contractType)} - ${describeInvoiceNumbers(invoices.map((invoice) => invoice.invoiceBillNo))}`;

// hierarchy: { companyId, sbuId, plantId, locationId }.
export const serializeDraft = ({ contractType, hierarchy, invoices, title }) => {
  const files = [];
  const plainInvoices = invoices.map((invoice, index) => stripInvoice(invoice, index, files));
  return {
    draft: {
      draftType: DRAFT_TYPES.ADD,
      title: title || buildDraftTitle(contractType, invoices),
      contractType,
      invoiceCount: invoices.length,
      page: { contractType, hierarchy, invoices: plainInvoices },
    },
    files,
  };
};

const toFile = async (reference, fileIndex, downloadFile) => {
  const meta = reference?.draftFileKey ? fileIndex[reference.draftFileKey] : null;
  if (!meta) return null;
  const blob = await downloadFile(reference.draftFileKey);
  return new File([blob], meta.originalName, { type: meta.mimeType || blob.type });
};

// Rebuilds page invoices with fresh local ids and real File objects.
export const restoreDraftInvoices = async ({ invoices = [], fileIndex = {}, downloadFile }) =>
  Promise.all(
    invoices.map(async (invoice) => {
      const restored = { ...invoice, id: nextLocalId(), items: (invoice.items || []).map((item) => ({ ...item, id: nextLocalId() })) };
      await Promise.all(
        DOCUMENT_FIELDS.map(async ({ field }) => {
          restored[field] = await toFile(invoice[field], fileIndex, downloadFile);
        })
      );
      return restored;
    })
  );

// Edit Invoice: the edited rows plus the attachments queued on each row.
// Attachments already saved on an invoice stay on the invoice itself.
export const serializeEditDraft = (rows) => {
  const files = [];
  const plainRows = rows.map(({ pendingUploads, ...row }, rowIndex) => ({
    ...row,
    pendingUploads: pendingUploads.map((file, fileIndex) => {
      const key = `row${rowIndex}_new${fileIndex}`;
      files.push({ key, file });
      return { draftFileKey: key };
    }),
  }));
  return {
    draft: {
      draftType: DRAFT_TYPES.EDIT,
      title: `Edit - ${describeInvoiceNumbers(rows.map((row) => row.invoiceBillNo))}`,
      contractType: null,
      invoiceCount: rows.length,
      page: { invoiceIds: rows.map((row) => row.invoiceId), rows: plainRows },
    },
    files,
  };
};

// Rebuilds the edited rows of an Edit Invoice draft with real File objects.
export const restoreEditDraftRows = async ({ rows = [], fileIndex = {}, downloadFile }) =>
  Promise.all(
    rows.map(async (row) => {
      const files = await Promise.all((row.pendingUploads || []).map((reference) => toFile(reference, fileIndex, downloadFile)));
      return { ...row, pendingUploads: files.filter(Boolean) };
    })
  );
