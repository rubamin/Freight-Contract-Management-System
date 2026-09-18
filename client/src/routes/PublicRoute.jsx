import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

const PublicRoute = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);

  if (isAuthenticated) {
<<<<<<< HEAD
    return <Navigate to="/dashboard" replace />;
=======
    return <Navigate to="/vendors" replace />;
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
  }

  return <Outlet />;
};

export default PublicRoute;
