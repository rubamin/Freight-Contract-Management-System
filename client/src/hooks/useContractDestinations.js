import { useCallback, useEffect, useRef, useState } from "react";
import { getContractDestinations } from "../services/invoiceEntryService";

const LOADING_ENTRY = { loading: true, failed: false, destinations: [] };
const FAILED_ENTRY = { loading: false, failed: true, destinations: [] };

const cacheKey = (vendorId, contractType) => `${contractType}|${vendorId}`;

const splitKey = (key) => {
  const [contractType, vendorId] = key.split("|");
  return { contractType, vendorId };
};

// Loads the destinations of each vendor's active contract once per
// vendor + contract type. `pairs` is the list of [vendorId, contractType]
// currently on screen; the returned getter gives the entry of one pair.
const useContractDestinations = (pairs) => {
  const [entries, setEntries] = useState({});
  const requestedKeys = useRef(new Set());

  const pairsKey = [...new Set(
    pairs.filter(([vendorId, contractType]) => vendorId && contractType).map(([vendorId, contractType]) => cacheKey(vendorId, contractType))
  )].sort().join(",");

  useEffect(() => {
    pairsKey.split(",").filter(Boolean).forEach((key) => {
      if (requestedKeys.current.has(key)) return;
      requestedKeys.current.add(key);
      const { vendorId, contractType } = splitKey(key);
      setEntries((current) => ({ ...current, [key]: LOADING_ENTRY }));
      getContractDestinations(vendorId, contractType)
        .then((data) => setEntries((current) => ({ ...current, [key]: { loading: false, failed: false, ...data } })))
        .catch(() => {
          requestedKeys.current.delete(key);
          setEntries((current) => ({ ...current, [key]: FAILED_ENTRY }));
        });
    });
  }, [pairsKey]);

  return useCallback(
    (vendorId, contractType) => (vendorId && contractType ? entries[cacheKey(vendorId, contractType)] || LOADING_ENTRY : null),
    [entries]
  );
};

// Placeholder of the destination field for the state of its entry.
export const getDestinationPlaceholder = (entry, defaultPlaceholder) => {
  if (!entry) return "Select vendor first";
  if (entry.loading) return "Loading contract destinations...";
  if (entry.failed) return "Could not load contract destinations";
  if (!entry.destinations.length) return "No active contract destinations for this vendor";
  return defaultPlaceholder;
};

// True when the city is filled but is not one of the contract destinations.
export const isOutsideContract = (entry, city) => {
  const value = String(city || "").trim().toUpperCase();
  if (!value || !entry || entry.loading || entry.failed) return false;
  return !entry.destinations.some((destination) => destination.toUpperCase() === value);
};

export default useContractDestinations;
