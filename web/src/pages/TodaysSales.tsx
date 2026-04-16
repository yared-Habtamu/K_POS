import React from 'react';
import { RoleLayout } from '@/components/layout/RoleLayout';
import useTodaysSales from '@/hooks/useTodaysSales';
import TodaysSalesView from '@/components/reports/TodaysSalesView';
import CashierDashboard from '@/components/reports/CashierDashboard';
import SoldItemsTable from '@/components/reports/SoldItemsTable';
import { useAuthStore } from '@/stores/authStore';

const TodaysSales: React.FC = () => {
  const { items, totals, loading } = useTodaysSales();
  const user = useAuthStore((s) => s.user);
  const isCashier = user?.role === 'cashier';

  return (
    <RoleLayout allowedRoles={["owner", "manager", "cashier"]}>
      <div>
        {isCashier ? (
          <>
            <CashierDashboard items={items} totals={totals} />
            <TodaysSalesView items={items} loading={loading} totals={totals} hideHeader />
          </>
        ) : (
          <>
            <TodaysSalesView items={items} loading={loading} totals={totals} />
            <div className="mt-6">
              <SoldItemsTable items={items} totals={totals} loading={loading} />
            </div>
          </>
        )}
      </div>
    </RoleLayout>
  );
};

export default TodaysSales;
