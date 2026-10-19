import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { hasReadPermission, hasFeatureAccess } from '../../utils/permissions';

export const ProtectedRoute = ({ requiredPermission }) => {
  const { user, isLoading } = useAuth();
  const { pathname } = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent"></div>
          <span className="text-sm font-medium text-slate-400">Загрузка системы...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.permissions?.includes('access.v2') && user?.permissions?.includes('finance.restricted') &&
    !/^\/(?:finance\/(?:calendar|debtors|income|expenses|cashflow)|payments(?:\/plan-fact)?)(?:\/|$)/.test(pathname)) {
    return <Navigate to="/finance/expenses" replace />;
  }

  if (!hasFeatureAccess(user, pathname) || (requiredPermission && !hasReadPermission(user, requiredPermission))) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export const PermissionGuard = ({ requiredPermission, children }) => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (requiredPermission && !hasReadPermission(user, requiredPermission)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

