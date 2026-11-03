import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

const PublicRoute = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (isAuthenticated) {
    return <Navigate to={user?.MustChangePassword ? "/set-password" : "/dashboard"} replace />;
  }

  return <Outlet />;
};

export default PublicRoute;
