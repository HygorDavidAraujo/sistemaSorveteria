import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store';

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  requiredRole,
}) => {
  const { user } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !requiredRole.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
