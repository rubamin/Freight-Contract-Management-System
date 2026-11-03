import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

const ProtectedRoute = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Signed in with a temporary password: nothing opens until it is replaced.
  if (user?.MustChangePassword) {
    return <Navigate to="/set-password" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
