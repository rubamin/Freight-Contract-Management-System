import { useCallback, useEffect, useState } from "react";
import { deleteInvoiceDraft, listInvoiceDrafts } from "../services/invoiceDraftService";

// The logged-in user's own drafts and the drafts shared with them, plus a
// delete action that keeps the list in sync. Used by Add Invoice and the
// Invoice List.
const useInvoiceDrafts = () => {
  const [drafts, setDrafts] = useState([]);

  const reloadDrafts = useCallback(async () => {
    try {
      setDrafts(await listInvoiceDrafts());
    } catch (error) {
      console.warn("Could not load invoice drafts", error);
    }
  }, []);

  useEffect(() => {
    reloadDrafts();
  }, [reloadDrafts]);

  // Throws on failure so the caller can show its own message.
  const deleteDraft = useCallback(async (draftId) => {
    await deleteInvoiceDraft(draftId);
    setDrafts((prev) => prev.filter((draft) => draft.DraftID !== draftId));
  }, []);

  return { drafts, reloadDrafts, deleteDraft };
};

export default useInvoiceDrafts;
