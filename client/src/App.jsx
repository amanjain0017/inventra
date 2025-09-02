import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { DashboardProvider } from "./context/DashboardContext";
import { ProductProvider } from "./context/ProductContext";
import { InvoiceProvider } from "./context/InvoiceContext";

// Import authentication pages
import ForgotPassword from "./pages/Authentication/ForgotPassword";
import ResetPassword from "./pages/Authentication/ResetPassword";
import OTPVerification from "./pages/Authentication/OTPVerification";
import Signup from "./pages/Authentication/Signup";
import Login from "./pages/Authentication/Login";

// Import main application pages and components
import Home from "./pages/Home/Home";
import Invoice from "./pages/Invoice/Invoice";
import Product from "./pages/Product/Product";
import Settings from "./pages/Settings/Settings";
import Statistics from "./pages/Statistics/Statistics";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import Sidebar from "./components/Sidebar/Sidebar";

import ScrollToTop from "./ScrollToTop";

import "./App.css";

// Layout for main application pages
const DashboardLayout = ({ children }) => {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content">{children}</div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <DashboardProvider>
        <InvoiceProvider>
          <ProductProvider>
            <BrowserRouter>
              <ScrollToTop />
              <Routes>
                {/* Public Routes (Authentication pages) */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/otp-verification" element={<OTPVerification />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* Protected Routes (Main Application pages with Sidebar) */}
                <Route
                  path="/home"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Home />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/invoice"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Invoice />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/product"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Product />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Settings />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/statistics"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Statistics />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />

                {/* Catch all routes - redirect to login if not authenticated */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </BrowserRouter>
          </ProductProvider>
        </InvoiceProvider>
      </DashboardProvider>
    </AuthProvider>
  );
}

export default App;
