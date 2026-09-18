import React, { useState } from "react";
import {
    IconButton,
    Badge,
    Menu,
    Box,
    Typography,
    Divider,
    List,
    ListItem,
    ListItemText,
} from "@mui/material";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import useNotifications from "../../hooks/useNotifications";

const formatTimestamp = (isoString) => {
    try {
        return new Date(isoString).toLocaleString();
    } catch {
        return isoString;
    }
};

// Single reusable notification bell: badge count, dropdown list, and
// mark-all-as-read on open. All notification state/polling logic lives in
// useNotifications — this component is purely presentational.
const NotificationCenter = () => {
    const { notifications, unreadCount, markAllAsRead } = useNotifications();
    const [anchorEl, setAnchorEl] = useState(null);

    const handleOpen = (event) => {
        setAnchorEl(event.currentTarget);
        markAllAsRead();
    };

    const handleClose = () => setAnchorEl(null);

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
                        sx: { mt: 1.5, width: 360, maxHeight: 420, borderRadius: 2 },
                    },
                }}
            >
                <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                        Notifications
                    </Typography>
                </Box>
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
                            <ListItem key={notification.NotificationID} divider>
                                <ListItemText
                                    primary={notification.Message}
                                    secondary={formatTimestamp(notification.CreatedAt)}
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
