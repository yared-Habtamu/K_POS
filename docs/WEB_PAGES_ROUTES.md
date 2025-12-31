# Web App Pages & Routes (Role-Based)

This document lists the **routed pages** in the web frontend, what each page does, and which roles can access it.

## Roles
Defined in `web/src/types/index.ts`:
- `system_admin`
- `owner`
- `manager`
- `cashier`
- `store_keeper`

## Route Guard Behavior
Most authenticated pages are wrapped with `RoleLayout` (`web/src/components/layout/RoleLayout.tsx`):
- If the user is **not authenticated**: redirects to `/login`
- If authenticated but role is **not allowed**: redirects to the role dashboard:
  - `system_admin` → `/admin`
  - `owner` → `/owner`
  - `manager` → `/manager`
  - `cashier` → `/cashier`
  - `store_keeper` → `/store-keeper`

## Routed Pages (from `web/src/App.tsx`)

> Note: The **allowed roles** below are based on what the page itself enforces via `RoleLayout allowedRoles=[...]`.

| Route | Page (component) | What it does | Allowed roles | Notes |
|------|-------------------|--------------|---------------|-------|
| `/` | `Index` (`web/src/pages/Index.tsx`) | Landing page; “Get Started” routes user to their dashboard | Public | If authenticated, routes by role to dashboard |
| `/login` | `Login` (`web/src/pages/Login.tsx`) | Login form; after login navigates to role dashboard | Public | Uses backend role → frontend role mapping via auth store |
| `/cashier` | `CashierPOS` (`web/src/pages/cashier/CashierPOS.tsx`) | POS checkout screen: product search, cart, payment | `cashier`, `owner`, `manager` | Intended for cashier, but owner/manager also allowed |
| `/cashier/report` | `DailyReport` (`web/src/pages/cashier/DailyReport.tsx`) | Submit daily cashier financial report (auto-fills totals) | `cashier`, `manager`, `owner` | Reads today’s data and posts to `/api/daily-reports` |
| `/cashier/today-sales` | `TodaysSales` (`web/src/pages/TodaysSales.tsx`) | View today’s sales; cashier sees a cashier-focused view | `owner`, `manager`, `cashier` | Cashier gets an extra dashboard section |
| `/cashier/customers` | `CustomerManagement` (`web/src/pages/cashier/CustomerManagement.tsx`) | Add/view customers (simple CRUD) | `cashier` | Cashier-only |
| `/owner` | `OwnerDashboard` (`web/src/pages/owner/OwnerDashboard.tsx`) | Owner dashboard with KPIs and insights | `owner` | Owner-only |
| `/owner/pos` | `CashierPOS` (`web/src/pages/cashier/CashierPOS.tsx`) | POS screen (same as `/cashier`) | `cashier`, `owner`, `manager` | Owner route but allows cashier/manager too |
| `/owner/products` | `ProductManagement` (`web/src/pages/owner/ProductManagement.tsx`) | Owner product management (list/add/edit) | `owner` | Owner-only |
| `/owner/products/add` | `ProductAdd` (`web/src/pages/store-keeper/ProductAdd.tsx`) | Add a new product (with barcode/picture support) | `owner` | File is under `store-keeper/` but enforced as owner-only |
| `/owner/inventory` | `StockManagement` (`web/src/pages/store-keeper/StockManagement.tsx`) | Stock management (store ↔ supermarket levels, transfers) | `store_keeper` | **Mismatch:** route is under `/owner` but page is **store_keeper-only** → owners will be redirected |
| `/owner/employees` | `EmployeeManagement` (`web/src/pages/owner/EmployeeManagement.tsx`) | Owner employee + attendance management | `owner` | Owner-only |
| `/owner/expenses` | `ExpenseManagement` (`web/src/pages/owner/ExpenseManagement.tsx`) | Expense tracking + analytics | `owner` | Owner-only |
| `/alerts` | `OwnerAlerts` (`web/src/pages/owner/Alerts.tsx`) | Low-stock + expiring product alerts | `owner`, `manager`, `store_keeper` | Shared alerts page |
| `/owner/alerts` | `OwnerAlerts` (`web/src/pages/owner/Alerts.tsx`) | Same alerts page as `/alerts` | `owner`, `manager`, `store_keeper` | Alias route |
| `/owner/settings` | `OwnerSettings` (`web/src/pages/owner/Settings.tsx`) | Owner settings (branding, payment/currency, tax) | `owner` | Owner-only |
| `/owner/reports` | `ReportPage` (`web/src/pages/ReportPage.tsx`) | Sales reports with export (Excel/PDF) | `owner`, `manager` | Owner/manager |
| `/owner/today-sales` | `TodaysSales` (`web/src/pages/TodaysSales.tsx`) | Today’s sales view | `owner`, `manager`, `cashier` | Cashier also allowed |
| `/owner/assets` | `Assets` (`web/src/pages/manager/Assets.tsx`) | Asset registration + export/print | `manager`, `owner` | Owner and manager |
| `/owner/register` | `RegisterMart` (`web/src/pages/owner/RegisterMart.tsx`) | Register a new mart/supermarket (creates request) | Public | No `RoleLayout`; intended for new owners onboarding |
| `/owner/register/waiting/:id` | `RegisterWaiting` (`web/src/pages/owner/RegisterWaiting.tsx`) | Polls registration status until approved/rejected | Public | No `RoleLayout`; status page for onboarding |
| `/manager` | `ManagerDashboard` (`web/src/pages/manager/ManagerDashboard.tsx`) | Manager dashboard with KPIs and insights | `manager` | Manager-only |
| `/manager/employees` | `MEmployeeManagement` (`web/src/pages/manager/MEmployeeManagement.tsx`) | Manager employee + attendance management | `manager` | Manager-only |
| `/manager/approvals` | `ManagerApprovals` (`web/src/pages/manager/Approvals.tsx`) | Approve/reject product creations and stock transfers | `manager` | Manager-only |
| `/manager/inventory` | `Inventory` (`web/src/pages/Inventory.tsx`) | Inventory list view (search + pagination) | `owner`, `manager`, `store_keeper` | Store-keeper can access too |
| `/manager/assets` | `ManagerAssets` (`web/src/pages/manager/Assets.tsx`) | Asset registration (same component as owner assets) | `manager`, `owner` | Owner also allowed |
| `/manager/reports` | `ReportPage` (`web/src/pages/ReportPage.tsx`) | Sales reports with export (Excel/PDF) | `owner`, `manager` | Owner also allowed |
| `/manager/today-sales` | `TodaysSales` (`web/src/pages/TodaysSales.tsx`) | Today’s sales view | `owner`, `manager`, `cashier` | Cashier also allowed |
| `/store-keeper` | `StockManagement` (`web/src/pages/store-keeper/StockManagement.tsx`) | Stock management (store ↔ supermarket levels, transfers) | `store_keeper` | Store-keeper-only |
| `/store-keeper/add-stock` | `StockManagement` (`web/src/pages/store-keeper/StockManagement.tsx`) | Same stock management screen | `store_keeper` | Alias route |
| `/store-keeper/barcode` | `BarcodeManagement` (`web/src/pages/store-keeper/BarcodeManagement.tsx`) | Barcode search/scan + generate/print barcodes | `store_keeper` | Store-keeper-only |
| `/store-keeper/pictures` | `BarcodeManagement` (`web/src/pages/store-keeper/BarcodeManagement.tsx`) | Same barcode management screen | `store_keeper` | Alias route |
| `/inventory` | `Inventory` (`web/src/pages/Inventory.tsx`) | Inventory list view (search + pagination) | `owner`, `manager`, `store_keeper` | Top-level inventory route |
| `/admin` | `MainAdmin` (`web/src/pages/admin/MainAdmin.tsx`) | System admin overview (revenue, marts, users, activity) | `system_admin` | System admin-only |
| `/admin/shops` | `MartManagement` (`web/src/pages/admin/MartManagement.tsx`) | Approve/reject shops and manage marts | `system_admin` | System admin-only |
| `/admin/reports` | `MainAdmin` (`web/src/pages/admin/MainAdmin.tsx`) | System admin reports/overview (same component) | `system_admin` | Alias route |
| `*` | `NotFound` (`web/src/pages/NotFound.tsx`) | 404 page for unknown routes | Public | Logs missing path to console |

## Pages Present in Code but Not Directly Routed in `App.tsx`
These exist in `web/src/pages/**` but are not directly mounted by `web/src/App.tsx` routes (they may be unused, embedded, or planned):
- `web/src/pages/admin/AdminDashboard.tsx` (system admin)
- `web/src/pages/admin/AdminSettings.tsx` (system admin)
- `web/src/pages/manager/Alerts.tsx` (manager/owner/store_keeper)
- `web/src/pages/manager/POS.tsx`
- `web/src/pages/store-keeper/ProductManagement.tsx`

## Known Mismatch / Follow-Up
- Route `/owner/inventory` points to `StockManagement`, but that page only allows `store_keeper`. If owners should manage inventory too, either:
  - change the page `allowedRoles` to include `owner` (and maybe `manager`), or
  - point `/owner/inventory` to `Inventory` (read-only) or a separate owner inventory page.
