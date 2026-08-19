import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './features/auth/AuthContext';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { LoginPage } from './features/auth/LoginPage';
import { MainLayout } from './layouts/MainLayout';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { ProjectsPage } from './features/projects/ProjectsPage';
import { ProjectDetailPage } from './features/projects/ProjectDetailPage';
import { LeadsPage } from './features/leads/LeadsPage';
import { DealsPage } from './features/deals/DealsPage';
import { PaymentsPage } from './features/payments/PaymentsPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { ApartmentsPage } from './features/apartments/ApartmentsPage';
import { TasksPage } from './features/tasks/TasksPage';
import { ContractsPage } from './features/contracts/ContractsPage';
import { PaymentCalendarPage } from './features/finance/PaymentCalendarPage';
import { DebtorsPage } from './features/finance/DebtorsPage';
import { ReportsPage } from './features/reports/ReportsPage';
import { NotificationsPage } from './features/notifications/NotificationsPage';
import { UsersPage } from './features/users/UsersPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected CRM routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/:id" element={<ProjectDetailPage />} />
                <Route path="/apartments" element={<ApartmentsPage />} />
                <Route path="/leads" element={<LeadsPage />} />
                <Route path="/pipeline" element={<Navigate to="/leads" replace />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/deals" element={<DealsPage />} />
                <Route path="/contracts" element={<ContractsPage />} />
                <Route path="/payments" element={<PaymentsPage />} />
                <Route path="/finance/calendar" element={<PaymentCalendarPage />} />
                <Route path="/finance/debtors" element={<DebtorsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
