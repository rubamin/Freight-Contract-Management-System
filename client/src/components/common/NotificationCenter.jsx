import React, { useState } from "react";
import {
    IconButton,
    Badge,
    Menu,
    Box,
    Button,
    Typography,
    Divider,
    List,
    ListItem,
    ListItemText,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
} from "@mui/material";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import useNotifications from "../../hooks/useNotifications";
import { NOTIFICATION_SCOPE } from "../../constants/notifications";
import { DESKTOP_PERMISSION } from "../../utils/desktopNotification";

const formatTimestamp = (isoString) => {
    try {
        return new Date(isoString).toLocaleString();
    } catch {
        return isoString;
    }
};

const buildSecondaryText = (notification, showRecipient) => {
    const time = formatTimestamp(notification.CreatedAt);
    if (!showRecipient) return time;

    const recipient = notification.recipient?.FullName || notification.recipient?.Email || "Unassigned";
    return `${recipient} - ${time}`;
};

// Invites the user to turn on desktop alerts, or explains why they are off.
const DesktopAlertStatus = ({ permission, onEnable }) => {
    if (permission === DESKTOP_PERMISSION.DEFAULT) {
        return (
            <Box sx={{ px: 2, py: 1, display: "flex", alignItems: "center", gap: 1, bgcolor: "action.hover" }}>
                <Typography variant="caption" sx={{ flex: 1 }}>
                    Get desktop alerts when this tab is not open.
                </Typography>
                <Button size="small" onClick={onEnable}>
                    Enable
                </Button>
            </Box>
        );
    }

    if (permission === DESKTOP_PERMISSION.DENIED) {
        return (
            <Box sx={{ px: 2, py: 1, bgcolor: "action.hover" }}>
                <Typography variant="caption" color="text.secondary">
                    Desktop alerts are blocked. Allow notifications for this site in your browser settings.
                </Typography>
            </Box>
        );
    }

    return null;
};

// Notification bell: badge count, dropdown list, delete / clear, desktop
// alert opt-in, and (admins only) a switch to view every user's feed. All
// notification state and polling lives in useNotifications.
const NotificationCenter = () => {
    const [scope, setScope] = useState(NOTIFICATION_SCOPE.MINE);
    const {
        notifications,
        unreadCount,
        isAdmin,
        desktopPermission,
        markAllAsRead,
        removeNotification,
        clearAll,
        enableDesktopAlerts,
    } = useNotifications({ scope });
    const [anchorEl, setAnchorEl] = useState(null);

    const showAllUsers = isAdmin && scope === NOTIFICATION_SCOPE.ALL;

    const handleOpen = (event) => {
        setAnchorEl(event.currentTarget);
        markAllAsRead();
        // Opening the bell is a user click, so the browser allows the prompt.
        if (desktopPermission === DESKTOP_PERMISSION.DEFAULT) {
            enableDesktopAlerts();
        }
    };

    const handleClose = () => setAnchorEl(null);

    const handleScopeChange = (event, nextScope) => {
        if (nextScope) setScope(nextScope);
    };

    return (
        <>
            <IconButton onClick={handleOpen} sx={{ color: "#1F2937" }}>
                <Badge badgeContent={unreadCount} color="error">
                    <NotificationsRoundedIcon />
                </Badge>
            </IconButton>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                transformOrigin={{ horizontal: "right", vertical: "top" }}
                anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                slotProps={{
                    paper: {
                        sx: { mt: 1.5, width: 380, maxHeight: 480, borderRadius: 2 },
                    },
                }}
            >
                <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
                        Notifications
                    </Typography>
                    {!showAllUsers && notifications.length > 0 && (
                        <Button size="small" color="error" onClick={clearAll}>
                            Clear all
                        </Button>
                    )}
                </Box>

                {isAdmin && (
                    <Box sx={{ px: 2, pb: 1.5 }}>
                        <ToggleButtonGroup
                            size="small"
                            exclusive
                            fullWidth
                            value={scope}
                            onChange={handleScopeChange}
                        >
                            <ToggleButton value={NOTIFICATION_SCOPE.MINE}>My notifications</ToggleButton>
                            <ToggleButton value={NOTIFICATION_SCOPE.ALL}>All users</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                )}

                <DesktopAlertStatus permission={desktopPermission} onEnable={enableDesktopAlerts} />
                <Divider />

                {notifications.length === 0 ? (
                    <Box sx={{ px: 2, py: 3, textAlign: "center" }}>
                        <Typography variant="body2" color="text.secondary">
                            No notifications yet.
                        </Typography>
                    </Box>
                ) : (
                    <List sx={{ py: 0 }}>
                        {notifications.map((notification) => (
                            <ListItem
                                key={notification.NotificationID}
                                divider
                                secondaryAction={
                                    <Tooltip title="Delete">
                                        <IconButton
                                            edge="end"
                                            size="small"
                                            aria-label="delete notification"
                                            onClick={() => removeNotification(notification.NotificationID)}
                                        >
                                            <DeleteOutlineRoundedIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                }
                            >
                                <ListItemText
                                    primary={notification.Message}
                                    secondary={buildSecondaryText(notification, showAllUsers)}
                                    slotProps={{
                                        primary: { variant: "body2", fontWeight: 500 },
                                        secondary: { variant: "caption" },
                                    }}
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
            </Menu>
        </>
    );
};

export default NotificationCenter;
