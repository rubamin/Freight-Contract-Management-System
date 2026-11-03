import { useCallback, useEffect, useRef, useState } from "react";
import * as notificationService from "../services/notificationService";
import useLocalStorageState from "./useLocalStorageState";
import {
  MAX_DESKTOP_ALERTS_PER_POLL,
  NOTIFICATION_LAST_SEEN_STORAGE_KEY,
  NOTIFICATION_POLL_INTERVAL_MS,
  NOTIFICATION_SCOPE,
  NOTIFICATION_SOUND_URL,
  getNotificationTitle,
} from "../constants/notifications";
import {
  getDesktopPermission,
  requestDesktopPermission,
  showDesktopNotification,
} from "../utils/desktopNotification";

const getMaxNotificationId = (items) =>
  items.reduce((max, item) => Math.max(max, Number(item.NotificationID) || 0), 0);

// Single reusable source of truth for notification polling, unread count,
// the notification sound, desktop alerts, and deleting notifications.
// Any component that needs notification data (currently just
// NotificationCenter) should use this hook rather than fetching on its own.
const useNotifications = ({ scope = NOTIFICATION_SCOPE.MINE } = {}) => {
  const [notifications, setNotifications] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [desktopPermission, setDesktopPermission] = useState(getDesktopPermission);
  const [lastSeenAt, setLastSeenAt] = useLocalStorageState(NOTIFICATION_LAST_SEEN_STORAGE_KEY, null);

  // Highest notification ID seen so far, in memory only, so "brand new since
  // the last poll" can be told apart from "already there on page load"
  // (which must not play a sound or pop a desktop alert).
  const latestKnownIdRef = useRef(null);
  const audioRef = useRef(null);

  if (!audioRef.current && typeof Audio !== "undefined") {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
  }

  const playSound = useCallback(() => {
    audioRef.current?.play().catch(() => {
      // Browsers block autoplay until the user has interacted with the
      // page at least once; failing silently here is expected.
    });
  }, []);

  const announceNewNotifications = useCallback((items) => {
    const newItems = items.filter(
      (item) => Number(item.NotificationID) > latestKnownIdRef.current
    );
    if (!newItems.length) return;

    playSound();
    newItems.slice(0, MAX_DESKTOP_ALERTS_PER_POLL).forEach((item) =>
      showDesktopNotification({
        title: getNotificationTitle(item.Type),
        body: item.Message,
        tag: `notification-${item.NotificationID}`,
      })
    );
  }, [playSound]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationService.getRecentNotifications({ scope });
      const fetched = res.data?.data || [];
      const maxId = getMaxNotificationId(fetched);

      if (latestKnownIdRef.current !== null) {
        announceNewNotifications(fetched);
      }
      latestKnownIdRef.current = Math.max(latestKnownIdRef.current || 0, maxId);

      setIsAdmin(Boolean(res.data?.isAdmin));
      setNotifications(fetched);
    } catch (err) {
      console.error("Failed to poll notifications", err);
    }
  }, [scope, announceNewNotifications]);

  useEffect(() => {
    // Switching scope starts a fresh baseline so the existing items of the
    // new view don't all fire as "new".
    latestKnownIdRef.current = null;
    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, NOTIFICATION_POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(
    (item) => !lastSeenAt || new Date(item.CreatedAt) > new Date(lastSeenAt)
  ).length;

  const markAllAsRead = useCallback(() => {
    setLastSeenAt(new Date().toISOString());
  }, [setLastSeenAt]);

  const removeNotification = useCallback(async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications((prev) =>
        prev.filter((item) => item.NotificationID !== notificationId)
      );
    } catch (err) {
      console.error("Failed to delete notification", err);
    }
  }, []);

  const clearAll = useCallback(async () => {
    try {
      await notificationService.clearNotifications();
      await fetchNotifications();
    } catch (err) {
      console.error("Failed to clear notifications", err);
    }
  }, [fetchNotifications]);

  const enableDesktopAlerts = useCallback(async () => {
    setDesktopPermission(await requestDesktopPermission());
  }, []);

  return {
    notifications,
    unreadCount,
    isAdmin,
    desktopPermission,
    markAllAsRead,
    removeNotification,
    clearAll,
    enableDesktopAlerts,
  };
};

export default useNotifications;
