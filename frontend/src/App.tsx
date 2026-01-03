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
        <div className="flex h-screen bg-gray-50">
          <Sidebar />
          <div className="flex-1 flex flex-col ml-64 md:ml-64">
            <Header />
            <main className="flex-1 overflow-auto bg-gray-50 pt-20">
              <div className="p-8">
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