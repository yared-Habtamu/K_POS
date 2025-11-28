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

// Cashier Pages
import CashierPOS from "./pages/cashier/CashierPOS";
import DailyReport from "./pages/cashier/DailyReport";

// Owner Pages
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import ProductManagement from "./pages/owner/ProductManagement";
import EmployeeManagement from "./pages/owner/EmployeeManagement";
import ExpenseManagement from "./pages/owner/ExpenseManagement";

// Manager Pages
import ManagerDashboard from "./pages/manager/ManagerDashboard";

// Store Keeper Pages
import StockManagement from "./pages/store-keeper/StockManagement";
import BarcodeManagement from "./pages/store-keeper/BarcodeManagement";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";

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
          <Route path="/owner/reports" element={<OwnerDashboard />} />
          <Route path="/owner/customers" element={<OwnerDashboard />} />
          <Route path="/owner/settings" element={<OwnerDashboard />} />
          
          {/* Manager Routes */}
          <Route path="/manager" element={<ManagerDashboard />} />
          <Route path="/manager/employees" element={<EmployeeManagement />} />
          <Route path="/manager/inventory" element={<StockManagement />} />
          <Route path="/manager/assets" element={<ManagerDashboard />} />
          <Route path="/manager/reports" element={<ManagerDashboard />} />
          
          {/* Store Keeper Routes */}
          <Route path="/store-keeper" element={<StockManagement />} />
          <Route path="/store-keeper/add-stock" element={<StockManagement />} />
          <Route path="/store-keeper/barcode" element={<BarcodeManagement />} />
          <Route path="/store-keeper/pictures" element={<BarcodeManagement />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/shops" element={<AdminDashboard />} />
          <Route path="/admin/reports" element={<AdminDashboard />} />
          <Route path="/admin/settings" element={<AdminDashboard />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
