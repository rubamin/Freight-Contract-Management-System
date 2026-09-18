import { useState, useEffect } from "react";

// Generic persisted-state hook: behaves like useState, but reads its
// initial value from localStorage and writes back on every change. Reused
// anywhere a UI preference (sidebar collapsed, etc.) should survive a
// page refresh without needing a backend round trip.
const useLocalStorageState = (key, defaultValue) => {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore storage write failures (e.g. private browsing quota limits)
    }
  }, [key, value]);

  return [value, setValue];
};

export default useLocalStorageState;
