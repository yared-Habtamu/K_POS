import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { initSocket, disconnectSocket } from './utils/socket';
import "@/i18n";

// Pages
import Login from "./pages/Login";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ReportPage from "./pages/ReportPage";
import TodaysSales from "./pages/TodaysSales";

// Cashier Pages
import CashierPOS from "./pages/cashier/CashierPOS";
import DailyReport from "./pages/cashier/DailyReport";
import CustomerManagement from "./pages/cashier/CustomerManagement";

// Owner Pages
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import OwnerAlerts from "./pages/owner/Alerts";
import ProductManagement from "./pages/owner/ProductManagement";
import OwnerEmployeeManagement from "./pages/owner/EmployeeManagement";
import ExpenseManagement from "./pages/owner/ExpenseManagement";
import OwnerSettings from "./pages/owner/Settings";
import Inventory from "./pages/Inventory";
import OwnerAssets from "./pages/manager/Assets";
import RegisterMart from "./pages/owner/RegisterMart";
import RegisterWaiting from "./pages/owner/RegisterWaiting";

// Manager Pages
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import ManagerAssets from "./pages/manager/Assets";
import ManagerProductManagement from "./pages/manager/ProductManagement";
import MEmployeeManagement from "./pages/manager/MEmployeeManagement";
import ManagerApprovals from "./pages/manager/Approvals";
// Store Keeper Pages
import StockManagement from "./pages/store-keeper/StockManagement";
import BarcodeManagement from "./pages/store-keeper/BarcodeManagement";
import ProductAdd from "./pages/store-keeper/ProductAdd";

// Admin Pages
import MainAdmin from "./pages/admin/MainAdmin";
import MartManagement from "./pages/admin/MartManagement";

const queryClient = new QueryClient();

const App = () => {
  const user = useAuthStore((s) => s.user);

  // initialize or disconnect realtime socket when user logs in/out
  // This keeps permissions in sync across devices and sessions
  useEffect(() => {
    if (user?.token) initSocket(user.token);
    else disconnectSocket();
    return () => disconnectSocket();
  }, [user?.token]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />

          {/* Cashier Routes */}
          <Route path="/cashier" element={<CashierPOS />} />
          <Route path="/cashier/report" element={<DailyReport />} />
          <Route path="/cashier/today-sales" element={<TodaysSales />} />
          <Route path="/cashier/customers" element={<CustomerManagement />} />

          {/* Owner Routes */}
          <Route path="/owner" element={<OwnerDashboard />} />
          <Route path="/owner/pos" element={<CashierPOS />} />
          <Route path="/owner/products" element={<ProductManagement />} />
          <Route path="/owner/products/add" element={<ProductAdd />} />
          <Route path="/owner/inventory" element={<StockManagement />} />
          <Route path="/owner/employees" element={<OwnerEmployeeManagement />} />
          <Route path="/owner/expenses" element={<ExpenseManagement />} />
          <Route path="/alerts" element={<OwnerAlerts />} />
          <Route path="/owner/alerts" element={<OwnerAlerts />} />
          <Route path="/owner/settings" element={<OwnerSettings />} />
          <Route path="/owner/reports" element={<ReportPage />} />
          <Route path="/owner/today-sales" element={<TodaysSales />} />
          <Route path="/owner/assets" element={<OwnerAssets />} />
          <Route path="/owner/register" element={<RegisterMart />} />
          <Route
            path="/owner/register/waiting/:id"
            element={<RegisterWaiting />}
          />

          {/* Manager Routes */}
          <Route path="/manager" element={<ManagerDashboard />} />
          <Route path="/manager/products" element={<ManagerProductManagement />} />
          <Route path="/manager/products/add" element={<ProductAdd />} />
          <Route path="/manager/employees" element={<MEmployeeManagement />} />
          <Route path="/manager/approvals" element={<ManagerApprovals />} />
          <Route path="/manager/inventory" element={<Inventory />} />
          <Route path="/manager/assets" element={<ManagerAssets />} />
          <Route path="/manager/reports" element={<ReportPage />} />
          <Route path="/manager/today-sales" element={<TodaysSales />} />

          {/* Store Keeper Routes */}
          <Route path="/store-keeper" element={<StockManagement />} />
          <Route path="/store-keeper/add-stock" element={<StockManagement />} />
          <Route path="/store-keeper/inventory" element={<Inventory />} />
          <Route path="/store-keeper/barcode" element={<BarcodeManagement />} />
          <Route
            path="/store-keeper/pictures"
            element={<BarcodeManagement />}
          />

          {/* Generic Inventory route (top-level) */}
          <Route path="/inventory" element={<Inventory />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<MainAdmin />} />
          <Route path="/admin/shops" element={<MartManagement />} />
          <Route path="/admin/reports" element={<MainAdmin />} />
          {/* Generic Inventory route removed (reverted) */}

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
