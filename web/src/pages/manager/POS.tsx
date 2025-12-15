import React from 'react';
import { Navigate } from 'react-router-dom';

// This page was removed — redirect to the owner's POS which is the canonical POS UI.
export default function ManagerPOSRedirect() {
  return <Navigate to="/owner/pos" replace />;
}
