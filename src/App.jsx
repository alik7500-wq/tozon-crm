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
import { IncomePage } from './features/finance/IncomePage';
import { ExpensesPage } from './features/finance/ExpensesPage';
import { CashflowPage } from './features/finance/CashflowPage';
import { PlanFactPage } from './features/finance/PlanFactPage';
import { ReportsPage } from './features/reports/ReportsPage';
import { NotificationsPage } from './features/notifications/NotificationsPage';
import { UsersPage } from './features/users/UsersPage';
import { AutomationPage } from './features/automation/AutomationPage';
import { ClientsPage } from './features/crm/ClientsPage';
import { SmsNotificationsPage } from './features/crm/SmsNotificationsPage';
import { SmsTemplatesPage } from './features/crm/SmsTemplatesPage';
import { AnalyticsOnePage } from './features/analytics/AnalyticsOnePage';
import { AnalyticsTwoPage } from './features/analytics/AnalyticsTwoPage';
import { AnalyticsThreePage } from './features/analytics/AnalyticsThreePage';

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
                <Route path="/clients" element={<ClientsPage />} />
                <Route path="/crm/sms-notifications" element={<SmsNotificationsPage />} />
                <Route path="/crm/sms-templates" element={<SmsTemplatesPage />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/deals" element={<DealsPage />} />
                <Route path="/contracts" element={<ContractsPage />} />
                <Route path="/payments" element={<PaymentsPage />} />
                <Route path="/payments/plan-fact" element={<PlanFactPage />} />
                <Route path="/payments/fact" element={<PlanFactPage />} />
                <Route path="/payments/income-orders" element={<IncomePage />} />
                <Route path="/payments/expense-orders" element={<ExpensesPage />} />
                <Route path="/finance/calendar" element={<PaymentCalendarPage />} />
                <Route path="/finance/debtors" element={<DebtorsPage />} />
                <Route path="/finance/income" element={<IncomePage />} />
                <Route path="/finance/expenses" element={<ExpensesPage />} />
                <Route path="/finance/cashflow" element={<CashflowPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/analytics/1" element={<AnalyticsOnePage />} />
                <Route path="/analytics/2" element={<AnalyticsTwoPage />} />
                <Route path="/analytics/3" element={<AnalyticsThreePage />} />
                <Route path="/automation" element={<AutomationPage />} />
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
