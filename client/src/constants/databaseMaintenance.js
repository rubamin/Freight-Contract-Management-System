export const MAINTENANCE_ACTIONS = {
  DELETE: "delete",
  TRUNCATE: "truncate",
};

export const MAINTENANCE_ACTION_OPTIONS = [
  {
    value: MAINTENANCE_ACTIONS.DELETE,
    label: "Delete all data",
    description: "Removes every record of the module. New records continue from the last ID.",
  },
  {
    value: MAINTENANCE_ACTIONS.TRUNCATE,
    label: "Truncate all data",
    description: "Removes every record of the module and restarts the ID sequence at 1.",
  },
];
