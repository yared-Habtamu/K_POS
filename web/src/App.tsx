import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "@/i18n";

// Pages
import Login from "./pages/Login";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ReportPage from './pages/ReportPage';

// Cashier Pages
import CashierPOS from "./pages/cashier/CashierPOS";
import DailyReport from "./pages/cashier/DailyReport";

// Owner Pages
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import OwnerAlerts from "./pages/owner/Alerts";
import ProductManagement from "./pages/owner/ProductManagement";
import EmployeeManagement from "./pages/owner/EmployeeManagement";
import ExpenseManagement from "./pages/owner/ExpenseManagement";
import OwnerSettings from "./pages/owner/Settings";
import Inventory from "./pages/Inventory";
import OwnerAssets from "./pages/manager/Assets";

// Manager Pages
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import ManagerAssets from "./pages/manager/Assets";
import MEmployeeManagement from "./pages/manager/MEmployeeManagement";
// Store Keeper Pages
import StockManagement from "./pages/store-keeper/StockManagement";
import BarcodeManagement from "./pages/store-keeper/BarcodeManagement";

// Admin Pages
import MainAdmin from "./pages/admin/MainAdmin";
import MartManagement from "./pages/admin/MartManagement";

const queryClient = new QueryClient();

const App = () => (
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
          
          {/* Owner Routes */}
          <Route path="/owner" element={<OwnerDashboard />} />
          <Route path="/owner/pos" element={<CashierPOS />} />
          <Route path="/owner/products" element={<ProductManagement />} />
          <Route path="/owner/inventory" element={<StockManagement />} />
          <Route path="/owner/employees" element={<EmployeeManagement />} />
          <Route path="/owner/expenses" element={<ExpenseManagement />} />
          <Route path="/alerts" element={<OwnerAlerts />} />
          <Route path="/owner/alerts" element={<OwnerAlerts />} />
          <Route path="/owner/settings" element={<OwnerSettings />} />
          <Route path="/owner/reports" element={<ReportPage />} />
          <Route path="/owner/assets" element={<OwnerAssets />} />

          {/* Manager Routes */}
          <Route path="/manager" element={<ManagerDashboard />} />
          <Route path="/manager/employees" element={<MEmployeeManagement />} />
          <Route path="/manager/inventory" element={<Inventory />} />
          <Route path="/manager/assets" element={<ManagerAssets />} />
          <Route path="/manager/reports" element={<ReportPage />} />
          
          {/* Store Keeper Routes */}
          <Route path="/store-keeper" element={<StockManagement />} />
          <Route path="/store-keeper/add-stock" element={<StockManagement />} />
          <Route path="/store-keeper/barcode" element={<BarcodeManagement />} />
          <Route path="/store-keeper/pictures" element={<BarcodeManagement />} />

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

export default App;
