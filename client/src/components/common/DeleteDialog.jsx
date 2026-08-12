import React from "react";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
  Stack,
  Typography,
  Avatar,
} from "@mui/material";

import DeleteForeverRoundedIcon from "@mui/icons-material/DeleteForeverRounded";

const DeleteDialog = ({
  open,
  title = "Delete Confirmation",
  message = "Are you sure you want to delete this record?",
  loading = false,
  onClose,
  onConfirm,
}) => {
  return (
    <Dialog
      open={open}
      onClose={!loading ? onClose : undefined}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: 4,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack
          spacing={2}
          alignItems="center"
        >
          <Avatar
            sx={{
              bgcolor: "#FEE2E2",
              color: "#DC2626",
              width: 70,
              height: 70,
            }}
          >
            <DeleteForeverRoundedIcon fontSize="large" />
          </Avatar>

          <Typography
            variant="h5"
            fontWeight={700}
            textAlign="center"
          >
            {title}
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <DialogContentText
          sx={{
            textAlign: "center",
            color: "text.secondary",
          }}
        >
          {message}
        </DialogContentText>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 3,
          gap: 1,
        }}
      >
        <Button
          fullWidth
          variant="outlined"
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </Button>

        <Button
          fullWidth
          color="error"
          variant="contained"
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? (
            <CircularProgress
              size={20}
              color="inherit"
            />
          ) : (
            "Delete"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteDialog;