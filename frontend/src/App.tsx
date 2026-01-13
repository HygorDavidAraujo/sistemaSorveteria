import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '@/store';

// Pages
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { SalesPage } from '@/pages/SalesPage';
import { ProductsPage } from '@/pages/ProductsPage';
import { CustomersPage } from '@/pages/CustomersPage';
import { CashPage } from '@/pages/CashPage';
import { LoyaltyPage } from '@/pages/LoyaltyPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ComandasPage } from '@/pages/ComandasPage';
import { CouponsPage } from '@/pages/CouponsPage';
import { DeliveryPage } from '@/pages/DeliveryPage';
import { FinancialTransactionsPage } from '@/pages/FinancialTransactionsPage';
import { FinancialCategoriesPage } from '@/pages/FinancialCategoriesPage';
import { ProductCategoriesPage } from '@/pages/ProductCategoriesPage';
import { AccountsPayablePage } from '@/pages/AccountsPayablePage';
import { AccountsReceivablePage } from '@/pages/AccountsReceivablePage';
import { PaymentMethodsPage } from '@/pages/PaymentMethodsPage';

// Components
import { PrivateRoute } from '@/components/PrivateRoute';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';

import './App.css';

function App() {
  const { loadUser } = useAuthStore();
  const { user } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <Router>
      {user ? (
        <div className="app-container">
          <Sidebar />
          <div className="app-layout">
            <Header />
            <main className="app-main">
              <div className="app-content">
                <Routes>
                  <Route
                    path="/"
                    element={
                      <PrivateRoute>
                        <DashboardPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/sales"
                    element={
                      <PrivateRoute requiredRole={['admin', 'manager', 'operator', 'cashier']}>
                        <SalesPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/products"
                    element={
                      <PrivateRoute requiredRole={['admin', 'manager', 'operator']}>
                        <ProductsPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/product-categories"
                    element={
                      <PrivateRoute requiredRole={['admin', 'manager', 'operator']}>
                        <ProductCategoriesPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/customers"
                    element={
                      <PrivateRoute requiredRole={['admin', 'manager', 'operator']}>
                        <CustomersPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/cash"
                    element={
                      <PrivateRoute requiredRole={['admin', 'manager', 'cashier']}>
                        <CashPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/loyalty"
                    element={
                      <PrivateRoute requiredRole={['admin', 'manager', 'operator', 'cashier']}>
                        <LoyaltyPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/reports"
                    element={
                      <PrivateRoute requiredRole={['admin', 'manager']}>
                        <ReportsPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/financial/transactions"
                    element={
                      <PrivateRoute requiredRole={['admin', 'manager']}>
                        <FinancialTransactionsPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/financial/categories"
                    element={
                      <PrivateRoute requiredRole={['admin', 'manager']}>
                        <FinancialCategoriesPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/financial/accounts-payable"
                    element={
                      <PrivateRoute requiredRole={['admin', 'manager']}>
                        <AccountsPayablePage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/financial/accounts-receivable"
                    element={
                      <PrivateRoute requiredRole={['admin', 'manager']}>
                        <AccountsReceivablePage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/financial/payment-methods"
                    element={
                      <PrivateRoute requiredRole={['admin', 'manager']}>
                        <PaymentMethodsPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/comandas"
                    element={
                      <PrivateRoute requiredRole={['admin', 'manager', 'cashier']}>
                        <ComandasPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/delivery"
                    element={
                      <PrivateRoute requiredRole={['admin', 'manager', 'cashier']}>
                        <DeliveryPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/coupons"
                    element={
                      <PrivateRoute requiredRole={['admin', 'manager']}>
                        <CouponsPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <PrivateRoute requiredRole={['admin']}>
                        <SettingsPage />
                      </PrivateRoute>
                    }
                  />
                </Routes>
              </div>
            </main>
          </div>
        </div>
      ) : (
        <Routes>
          <Route path="*" element={<LoginPage />} />
        </Routes>
      )}
    </Router>
  );
}

export default App;