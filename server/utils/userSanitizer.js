// Shared helper for producing the safe, public-facing shape of a User
// record (never includes PasswordHash). Used by both authService (login/me)
// and userService (profile/preferences) so the shape stays in one place.
const sanitizeUser = (user) => ({
  UserID: user.UserID,
  RoleID: user.RoleID,
  FullName: user.FullName,
  Email: user.Email,
  MobileNo: user.MobileNo,
  ProfilePhotoUrl: user.ProfilePhotoUrl,
  IsActive: user.IsActive,
  LastLogin: user.LastLogin,
  role: user.role,
});

module.exports = { sanitizeUser };
