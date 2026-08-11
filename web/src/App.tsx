import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  HashRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useEffect, useRef } from "react";
import { useAuthStore } from "./stores/authStore";
import { useCartStore } from "./stores/cartStore";
import { initSocket, disconnectSocket } from "./utils/socket";
import "@/i18n";
import AutoCompleteExample from "@/components/examples/AutoCompleteExample";
import AdvancedFiltersExample from "@/components/examples/AdvancedFiltersExample";
import DataTableExample from "@/components/examples/DataTableExample";
import ModalExample from "@/components/examples/ModalExample";
import SuccessModalExample from "@/components/examples/SuccessModalExample";
import ThreeDotActionMenuExample from "@/components/examples/ThreeDotActionMenuExample";

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
import CashierSettings from "./pages/cashier/Settings";
import ChatPage from "./pages/ChatPage";

// Owner Pages
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import OwnerAlerts from "./pages/owner/Alerts";
import ProductManagement from "./pages/owner/ProductManagement";
import OwnerEmployeeManagement from "./pages/owner/EmployeeManagement";
import ExpenseManagement from "./pages/owner/ExpenseManagement";
import OwnerSettings from "./pages/owner/Settings";
import OwnerApprovals from "./pages/owner/Approvals";
import Inventory from "./pages/Inventory";
import OwnerAssets from "./pages/manager/Assets";
import RegisterMart from "./pages/owner/RegisterMart";
import RegisterWaiting from "./pages/owner/RegisterWaiting";
import ProfilePage from "./pages/Profile";
import OwnerOpenCashPage from "./pages/owner/OpenCash";
import SaleCancellationsPage from "./pages/owner/SaleCancellations";

// Manager Pages
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import ManagerAssets from "./pages/manager/Assets";
import ManagerProductManagement from "./pages/manager/ProductManagement";
import MEmployeeManagement from "./pages/manager/MEmployeeManagement";
import ManagerApprovals from "./pages/manager/Approvals";
import ManagerExpenseManagement from "./pages/manager/ExpenseManagement";
import ManagerSettings from "./pages/manager/Settings";
import ManagerOpenCashPage from "./pages/manager/OpenCash";
import AgingStockPage from "./pages/AgingStockPage";
// Store Keeper Pages
import StockManagement from "./pages/store-keeper/StockManagement";
import BarcodeManagement from "./pages/store-keeper/BarcodeManagement";
import ProductAdd from "./pages/store-keeper/ProductAdd";
import StoreKeeperProductManagement from "./pages/store-keeper/ProductManagement";
import StoreKeeperApprovals from "./pages/store-keeper/Approvals";
import StoreKeeperSettings from "./pages/store-keeper/Settings";
import ApprovalHistoryPage from "./pages/ApprovalHistoryPage";

// Admin Pages
import MainAdmin from "./pages/admin/MainAdmin";
import MartManagement from "./pages/admin/MartManagement";
import AdminRegisterMart from "./pages/admin/RegisterMart";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminSettings from "./pages/admin/AdminSettings";
import MartDetails from "./pages/admin/MartDetails";
import { NotificationService } from "./components/notifications/NotificationService";
import { useSessionTimeout } from "./hooks/useSessionTimeout";

const queryClient = new QueryClient();

const App = () => {
  const user = useAuthStore((s) => s.user);
  const clearCart = useCartStore((s) => s.clearCart);
  const previousUserKeyRef = useRef<string | null>(null);

  useSessionTimeout();
  const Router: any =
    window.location.protocol === "file:" ? HashRouter : BrowserRouter;
  const routerFutureFlags = {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  };

  const currentUserKey = user
    ? String(user.id || `${user.username}:${user.role}:${user.martId || ""}`)
    : null;

  // initialize or disconnect realtime socket when user logs in/out
  // This keeps permissions in sync across devices and sessions
  useEffect(() => {
    if (user?.token) initSocket(user.token);
    else disconnectSocket();
    return () => disconnectSocket();
  }, [user?.token]);

  // Prevent cart data from leaking between employees when accounts change.
  useEffect(() => {
    if (previousUserKeyRef.current !== currentUserKey) {
      clearCart();
      previousUserKeyRef.current = currentUserKey;
    }
  }, [currentUserKey, clearCart]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <NotificationService />
        <Toaster />
        <Sonner />
        <Router future={routerFutureFlags}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route
              path="/examples/advanced-filters"
              element={<AdvancedFiltersExample />}
            />
            <Route
              path="/examples/auto-complete"
              element={<AutoCompleteExample />}
            />
            <Route path="/examples/data-table" element={<DataTableExample />} />
            <Route path="/examples/modal" element={<ModalExample />} />
            <Route
              path="/examples/success-modal"
              element={<SuccessModalExample />}
            />
            <Route
              path="/examples/three-dot-menu"
              element={<ThreeDotActionMenuExample />}
            />

            {/* Cashier Routes */}
            <Route path="/cashier" element={<CashierPOS />} />
            <Route path="/cashier/report" element={<DailyReport />} />
            <Route path="/cashier/today-sales" element={<TodaysSales />} />
            <Route path="/cashier/customers" element={<CustomerManagement />} />
            <Route path="/cashier/chat" element={<ChatPage />} />
            <Route path="/cashier/sale-cancellations" element={<SaleCancellationsPage />} />
            <Route path="/cashier/settings" element={<CashierSettings />} />

            {/* Owner Routes */}
            <Route path="/owner" element={<OwnerDashboard />} />
            <Route path="/owner/pos" element={<CashierPOS />} />
            <Route path="/owner/products" element={<ProductManagement />} />
            <Route path="/owner/products/add" element={<ProductAdd />} />
            <Route path="/owner/inventory" element={<StockManagement />} />
            <Route path="/owner/add-stock" element={<StockManagement />} />
            <Route path="/owner/addstock" element={<StockManagement />} />
            <Route
              path="/owner/employees"
              element={<OwnerEmployeeManagement />}
            />
            <Route path="/owner/expenses" element={<ExpenseManagement />} />
            <Route path="/owner/customers" element={<CustomerManagement />} />
            <Route path="/alerts" element={<OwnerAlerts />} />
            <Route path="/owner/alerts" element={<OwnerAlerts />} />
            <Route
              path="/owner/aging-stock"
              element={<AgingStockPage />}
            />
            <Route path="/owner/settings" element={<OwnerSettings />} />
            <Route path="/owner/approvals" element={<OwnerApprovals />} />
            <Route path="/owner/reports" element={<ReportPage />} />
            <Route path="/owner/today-sales" element={<TodaysSales />} />
            <Route path="/owner/assets" element={<OwnerAssets />} />
            <Route path="/owner/open-cash" element={<OwnerOpenCashPage />} />
            <Route path="/owner/sale-cancellations" element={<SaleCancellationsPage />} />
            <Route path="/owner/register" element={<RegisterMart />} />
            <Route
              path="/owner/register/waiting/:id"
              element={<RegisterWaiting />}
            />

            {/* Manager Routes */}
            <Route path="/manager" element={<ManagerDashboard />} />
            <Route
              path="/manager/products"
              element={<ManagerProductManagement />}
            />
            <Route path="/manager/products/add" element={<ProductAdd />} />
            <Route
              path="/manager/employees"
              element={<MEmployeeManagement />}
            />
            <Route path="/manager/customers" element={<CustomerManagement />} />
            <Route path="/manager/approvals" element={<ManagerApprovals />} />
            <Route
              path="/manager/approval-history"
              element={<ApprovalHistoryPage />}
            />
            <Route path="/manager/inventory" element={<Inventory />} />
            <Route path="/manager/assets" element={<ManagerAssets />} />
            <Route path="/manager/reports" element={<ReportPage />} />
            <Route path="/manager/today-sales" element={<TodaysSales />} />
            <Route
              path="/manager/expenses"
              element={<ManagerExpenseManagement />}
            />
            <Route path="/manager/open-cash" element={<ManagerOpenCashPage />} />
            <Route path="/manager/sale-cancellations" element={<SaleCancellationsPage />} />
            <Route path="/manager/chat" element={<ChatPage />} />
            <Route path="/manager/settings" element={<ManagerSettings />} />
            <Route
              path="/manager/aging-stock"
              element={<AgingStockPage />}
            />

            {/* Store Keeper Routes */}
            <Route path="/store-keeper" element={<Inventory />} />
            <Route path="/store-keeper/inventory" element={<Inventory />} />
            <Route
              path="/store-keeper/add-stock"
              element={<StockManagement />}
            />
            <Route
              path="/store-keeper/barcode"
              element={<BarcodeManagement />}
            />
            <Route
              path="/store-keeper/pictures"
              element={<BarcodeManagement />}
            />
            <Route
              path="/store-keeper/products"
              element={<StoreKeeperProductManagement />}
            />
            <Route
              path="/store-keeper/approvals"
              element={<StoreKeeperApprovals />}
            />
            <Route
              path="/store-keeper/approval-history"
              element={<ApprovalHistoryPage />}
            />
            <Route
              path="/store-keeper/settings"
              element={<StoreKeeperSettings />}
            />

            {/* Generic Inventory route (top-level) */}
            <Route path="/inventory" element={<Inventory />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<MainAdmin />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route
              path="/admin/subscriptions"
              element={<AdminSubscriptions />}
            />
            <Route path="/admin/mart/:martId" element={<MartDetails />} />
            <Route path="/admin/shops" element={<MartManagement />} />
            <Route
              path="/admin/register-mart"
              element={<AdminRegisterMart />}
            />
            <Route path="/admin/reports" element={<MainAdmin />} />
            {/* Generic Inventory route removed (reverted) */}

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
