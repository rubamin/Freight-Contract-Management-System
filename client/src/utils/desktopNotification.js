import { DESKTOP_NOTIFICATION_ICON_URL } from "../constants/notifications";

// Thin wrapper around the browser Notification API so desktop alerts work
// the same way everywhere: shown only when the app tab is hidden or the
// browser window is not focused, and clicking one brings the app forward.

export const DESKTOP_PERMISSION = {
  GRANTED: "granted",
  DENIED: "denied",
  DEFAULT: "default",
  UNSUPPORTED: "unsupported",
};

const isSupported = () => typeof window !== "undefined" && "Notification" in window;

export const getDesktopPermission = () =>
  isSupported() ? window.Notification.permission : DESKTOP_PERMISSION.UNSUPPORTED;

// Must be called from a user action (e.g. a click), otherwise most browsers
// ignore or silently block the permission prompt.
export const requestDesktopPermission = async () => {
  const current = getDesktopPermission();
  if (current !== DESKTOP_PERMISSION.DEFAULT) {
    return current;
  }
  return window.Notification.requestPermission();
};

const isAppInBackground = () =>
  document.visibilityState !== "visible" || !document.hasFocus();

export const showDesktopNotification = ({ title, body, tag }) => {
  if (getDesktopPermission() !== DESKTOP_PERMISSION.GRANTED || !isAppInBackground()) {
    return;
  }

  try {
    const notification = new window.Notification(title, {
      body,
      tag,
      icon: DESKTOP_NOTIFICATION_ICON_URL,
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (err) {
    // Some mobile browsers only allow notifications from a service worker;
    // the in-app bell still shows the notification in that case.
    console.error("Desktop notification could not be shown", err);
  }
};
