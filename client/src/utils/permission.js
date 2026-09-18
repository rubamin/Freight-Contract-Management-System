export const hasRole = (user, roleName) => {
  return user?.role?.RoleName === roleName;
};

export const hasAnyRole = (user, roles = []) => {
  return roles.includes(user?.role?.RoleName);
};
