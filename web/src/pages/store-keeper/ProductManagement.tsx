import { Navigate } from "react-router-dom";

// This page was previously a full ProductManagement copy for the store-keeper role.
// The store-keeper should only use a dedicated Product Add page now. Redirect
// here to the add page to avoid duplication.

export default function StoreKeeperProductManagement() {
  // Store-keeper product management should redirect to the stock dashboard
  return <Navigate to="/store-keeper" replace />;
}
