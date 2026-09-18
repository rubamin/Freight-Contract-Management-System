import { useCallback, useEffect, useRef, useState } from "react";
import * as notificationService from "../services/notificationService";
import useLocalStorageState from "./useLocalStorageState";

const POLL_INTERVAL_MS = 30000;
const NOTIFICATION_SOUND_URL = "/assets/notification-sound.wav";
const LAST_SEEN_STORAGE_KEY = "notificationsLastSeenAt";

// Single reusable source of truth for notification polling, unread count,
// and the notification sound. Any component that needs notification data
// (currently just NotificationCenter) should use this hook rather than
// polling/fetching independently.
const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [lastSeenAt, setLastSeenAt] = useLocalStorageState(LAST_SEEN_STORAGE_KEY, null);

  // Tracks the highest notification ID seen across polls, in memory only,
  // so we can tell "brand new since last poll" apart from "existing on
  // first page load" (which should not play a sound).
  const latestKnownIdRef = useRef(null);
  const audioRef = useRef(null);

  if (!audioRef.current && typeof Audio !== "undefined") {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
  }

  const playSound = useCallback(() => {
    audioRef.current?.play().catch(() => {
      // Browsers block autoplay until the user has interacted with the
      // page at least once; failing silently here is expected/fine.
    });
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationService.getRecentNotifications();
      const fetched = res.data?.data || [];

      const maxId = fetched.reduce(
        (max, item) => Math.max(max, item.NotificationID || 0),
        0
      );

      if (latestKnownIdRef.current === null) {
        latestKnownIdRef.current = maxId;
      } else if (maxId > latestKnownIdRef.current) {
        playSound();
        latestKnownIdRef.current = maxId;
      }

      setNotifications(fetched);
    } catch (err) {
      console.error("Failed to poll notifications", err);
    }
  }, [playSound]);

  useEffect(() => {
    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(
    (item) => !lastSeenAt || new Date(item.CreatedAt) > new Date(lastSeenAt)
  ).length;

  const markAllAsRead = useCallback(() => {
    setLastSeenAt(new Date().toISOString());
  }, [setLastSeenAt]);

  return { notifications, unreadCount, markAllAsRead };
};

export default useNotifications;
