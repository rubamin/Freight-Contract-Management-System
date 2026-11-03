// Shared View / Add / Edit rules of the User Master permission matrices:
// Add or Edit always includes View, and removing View removes both.
export const ACCESS_FLAGS = ["canView", "canAdd", "canEdit"];

export const ACCESS_FLAG_LABELS = { canView: "View", canAdd: "Add", canEdit: "Edit" };

export const NO_ACCESS = { canView: false, canAdd: false, canEdit: false };

export const applyAccessFlag = (current, flag, value) => {
  const next = { ...NO_ACCESS, ...current, [flag]: value };
  if (flag === "canView" && !value) return { ...NO_ACCESS };
  if (flag !== "canView" && value) next.canView = true;
  return next;
};

// Sets one flag on many keys of a { [key]: flags } map.
export const applyAccessFlagToMany = (map, keys, flag, value) => {
  const next = { ...map };
  keys.forEach((key) => {
    next[key] = applyAccessFlag(map[key], flag, value);
  });
  return next;
};

// Checkbox state of a flag over many keys: all / some / none.
export const getGroupFlagState = (map, keys, flag) => {
  const count = keys.filter((key) => map[key]?.[flag]).length;
  return { checked: keys.length > 0 && count === keys.length, indeterminate: count > 0 && count < keys.length };
};
