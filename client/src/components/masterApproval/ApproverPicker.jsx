import React from "react";
import { Autocomplete, Box, Chip, TextField, Typography } from "@mui/material";

const userLabel = (user) => user?.FullName || user?.Email || `User #${user?.UserID}`;

// Multi-select of active users who approve a master change.
const ApproverPicker = ({ label, users, value, onChange, error }) => {
  const selected = users.filter((user) => value.includes(Number(user.UserID)));

  return (
    <Autocomplete
      multiple
      size="small"
      options={users}
      value={selected}
      disableCloseOnSelect
      getOptionLabel={userLabel}
      isOptionEqualToValue={(option, item) => Number(option.UserID) === Number(item.UserID)}
      onChange={(event, users_) => onChange(users_.map((user) => Number(user.UserID)))}
      renderOption={(props, user) => {
        const { key, ...optionProps } = props;
        return (
          <Box component="li" key={key} {...optionProps} sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start !important" }}>
            <Typography variant="body2" fontWeight={600}>{userLabel(user)}</Typography>
            <Typography variant="caption" color="text.secondary">{[user.RoleName, user.Email].filter(Boolean).join(" · ")}</Typography>
          </Box>
        );
      }}
      renderValue={(users_, getItemProps) =>
        users_.map((user, index) => {
          const { key, ...chipProps } = getItemProps({ index });
          return <Chip key={key} size="small" color="primary" variant="outlined" label={userLabel(user)} {...chipProps} />;
        })
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={selected.length ? "" : "Search users"}
          error={Boolean(error)}
          helperText={error || " "}
        />
      )}
    />
  );
};

export default ApproverPicker;
