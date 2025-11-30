import React from 'react';
import { Navigate } from 'react-router-dom';

export type UserRole = 'manager' | 'staff';

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  role: UserRole | null;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, allowedRoles, role }) => {
  if (!role) {
    // Chưa login hoặc chưa biết role → redirect login
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    // Không đủ quyền → redirect về home
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
