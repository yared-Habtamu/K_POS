import React from 'react';
import { RoleLayout } from '@/components/layout/RoleLayout';
import useTodaysSales from '@/hooks/useTodaysSales';
import TodaysSalesView from '@/components/reports/TodaysSalesView';

const TodaysSales: React.FC = () => {
  const { items, totals, loading } = useTodaysSales();

  return (
    <RoleLayout allowedRoles={["owner", "manager", "cashier"]}>
      <div>
        <TodaysSalesView items={items} loading={loading} totals={totals} />
      </div>
    </RoleLayout>
  );
};

export default TodaysSales;
