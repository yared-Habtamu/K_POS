import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import customersApi from "@/lib/api/customers";

export default function useCustomers() {
  const auth = useAuthStore((s) => s.user);
  const token = auth?.token;
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (auth && auth.role === "system_admin") {
        if (auth.martId) params.martId = auth.martId;
      }
      const res = await customersApi.fetchCustomers(params, token);
      setCustomers(res || []);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, [auth?.role, auth?.martId, token]);

  const create = async (payload: {
    name: string;
    phoneNumber: string;
    city?: string;
  }) => {
    const res = await customersApi.createCustomer(payload, token);
    setCustomers((s) => [res, ...s]);
    return res;
  };

  return { customers, loading, error, fetch, create };
}
