import React, { useState } from 'react';
import { RoleLayout } from '@/components/layout/RoleLayout';
import useCustomers from '@/hooks/useCustomers';
import { toast } from '@/hooks/use-toast';

export default function CustomerManagement() {
  const { customers, loading, error, create } = useCustomers();
  const [form, setForm] = useState({ name: '', phoneNumber: '', city: '' });
  const [submitting, setSubmitting] = useState(false);

  const [formErrors, setFormErrors] = useState<{ name?: string; phoneNumber?: string }>({});

  const validate = () => {
    const errs: any = {};
    if (!form.name || String(form.name).trim().length < 2) errs.name = 'Please enter a valid name (min 2 characters)';
    if (!form.phoneNumber || String(form.phoneNumber).trim().length < 7) errs.phoneNumber = 'Please enter a valid phone number';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast({ title: 'Please fix validation errors', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await create(form);
      toast({ title: 'Customer added', description: `${res.name} added successfully.` });
      setForm({ name: '', phoneNumber: '', city: '' });
      setFormErrors({});
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Failed to add customer', description: err?.message || 'Server error', variant: 'destructive' });
    } finally { setSubmitting(false); }
  };

  return (
    <RoleLayout allowedRoles={["cashier"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Customer Management</h1>
            <p className="text-sm text-muted-foreground">Add and view customers (cashier only)</p>
          </div>
        </div>

        <div className="bg-card p-4 rounded-xl border">
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="flex flex-col">
              <input aria-label="Name" className={`border rounded px-3 py-2 ${formErrors.name ? 'border-red-400' : ''}`} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {formErrors.name && <span className="text-xs text-red-600 mt-1">{formErrors.name}</span>}
            </div>

            <div className="flex flex-col">
              <input aria-label="Phone number" className={`border rounded px-3 py-2 ${formErrors.phoneNumber ? 'border-red-400' : ''}`} placeholder="Phone number" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
              {formErrors.phoneNumber && <span className="text-xs text-red-600 mt-1">{formErrors.phoneNumber}</span>}
            </div>

            <input aria-label="City" className="border rounded px-3 py-2" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />

            <div className="flex items-center">
              <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded disabled:opacity-60" disabled={submitting}>{submitting ? 'Adding…' : 'Add Customer'}</button>
            </div>
          </form>
        </div>

        <div className="bg-card p-4 rounded-xl border">
          <h2 className="text-lg font-semibold mb-3">Your Customers</h2>
          {loading ? <div className="text-muted-foreground">Loading…</div> : (
            <div className="space-y-2">
              {customers.length === 0 && <div className="text-muted-foreground">No customers yet</div>}
              {customers.map((c: any) => (
                <div key={c._id} className="p-3 border rounded flex justify-between items-center">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-muted-foreground">{c.phoneNumber} • {c.city}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {error && <div className="text-red-600 mt-2">{error}</div>}
        </div>
      </div>
    </RoleLayout>
  );
}
