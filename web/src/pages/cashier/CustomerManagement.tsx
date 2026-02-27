import React, { useState } from 'react';
import { RoleLayout } from '@/components/layout/RoleLayout';
import useCustomers from '@/hooks/useCustomers';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';
import { Edit2, Check, X, CreditCard, Wallet, Banknote } from 'lucide-react';

export default function CustomerManagement() {
  const { customers, loading, error, create, update } = useCustomers();
  const { user } = useAuthStore();
  const [form, setForm] = useState({ name: '', phoneNumber: '', city: '' });
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const [formErrors, setFormErrors] = useState<{ name?: string; phoneNumber?: string }>({});

  const isManagement = user?.role === 'owner' || user?.role === 'manager';

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

  const startEdit = (customer: any) => {
    setEditingId(customer._id);
    setEditForm({
      totalCredit: customer.totalCredit || 0,
      totalPaid: customer.totalPaid || 0,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const onUpdate = async (id: string) => {
    try {
      await update(id, editForm);
      toast({ title: 'Customer updated', description: 'Credit information updated successfully.' });
      setEditingId(null);
    } catch (err: any) {
      toast({ title: 'Update failed', description: err?.message || 'Server error', variant: 'destructive' });
    }
  };

  return (
    <RoleLayout allowedRoles={["cashier", "owner", "manager"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Customer Management</h1>
            <p className="text-sm text-muted-foreground">Manage customers and track credit status</p>
          </div>
        </div>

        {/* Add Customer Form (Visible to all) */}
        <div className="bg-card p-4 rounded-xl border">
          <h2 className="text-lg font-semibold mb-3">Add New Customer</h2>
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="flex flex-col">
              <input aria-label="Name" className={`border rounded px-3 py-2 bg-background ${formErrors.name ? 'border-red-400' : ''}`} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {formErrors.name && <span className="text-xs text-red-600 mt-1">{formErrors.name}</span>}
            </div>

            <div className="flex flex-col">
              <input aria-label="Phone number" className={`border rounded px-3 py-2 bg-background ${formErrors.phoneNumber ? 'border-red-400' : ''}`} placeholder="Phone number" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
              {formErrors.phoneNumber && <span className="text-xs text-red-600 mt-1">{formErrors.phoneNumber}</span>}
            </div>

            <input aria-label="City" className="border rounded px-3 py-2 bg-background" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />

            <div className="flex items-center">
              <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded disabled:opacity-60" disabled={submitting}>{submitting ? 'Adding…' : 'Add Customer'}</button>
            </div>
          </form>
        </div>

        <div className="bg-card p-4 rounded-xl border">
          <h2 className="text-lg font-semibold mb-3">Customers List</h2>
          {loading ? <div className="text-muted-foreground">Loading…</div> : (
            <div className="space-y-3">
              {customers.length === 0 && <div className="text-muted-foreground">No customers yet</div>}
              {customers.map((c: any) => (
                <div key={c._id} className="p-4 border rounded-xl flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-bold text-lg">{c.name}</div>
                    <div className="text-sm text-muted-foreground">{c.phoneNumber} • {c.city || 'No City'}</div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-[2]">
                    <div className="bg-blue-50/50 dark:bg-blue-900/10 p-2 rounded-lg border border-blue-100 dark:border-blue-900/20">
                      <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 mb-1">
                        <CreditCard className="w-3 h-3" /> Total Credit
                      </div>
                      {editingId === c._id ? (
                        <input 
                          type="number" 
                          className="w-full bg-background border rounded px-2 py-1 text-sm text-blue-700 dark:text-blue-300"
                          value={editForm.totalCredit}
                          onChange={(e) => setEditForm({...editForm, totalCredit: Number(e.target.value)})}
                        />
                      ) : (
                        <div className="font-semibold text-blue-700 dark:text-blue-300">{Number(c.totalCredit || 0).toLocaleString()} <span className="text-xs font-normal">ETB</span></div>
                      )}
                    </div>

                    <div className="bg-green-50/50 dark:bg-green-900/10 p-2 rounded-lg border border-green-100 dark:border-green-900/20">
                      <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mb-1">
                        <Banknote className="w-3 h-3" /> Total Paid
                      </div>
                      {editingId === c._id ? (
                        <input 
                          type="number" 
                          className="w-full bg-background border rounded px-2 py-1 text-sm text-green-700 dark:text-green-300"
                          value={editForm.totalPaid}
                          onChange={(e) => setEditForm({...editForm, totalPaid: Number(e.target.value)})}
                        />
                      ) : (
                        <div className="font-semibold text-green-700 dark:text-green-300">{Number(c.totalPaid || 0).toLocaleString()} <span className="text-xs font-normal">ETB</span></div>
                      )}
                    </div>

                    <div className="bg-orange-50/50 dark:bg-orange-900/10 p-2 rounded-lg border border-orange-100 dark:border-orange-900/20">
                      <div className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1 mb-1">
                        <Wallet className="w-3 h-3" /> Unpaid Balance
                      </div>
                      <div className="font-bold text-orange-700 dark:text-orange-400">
                        {Number(c.totalUnpaid || 0).toLocaleString()} <span className="text-xs font-normal">ETB</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    {isManagement && (
                      editingId === c._id ? (
                        <div className="flex gap-2">
                          <button onClick={() => onUpdate(c._id)} className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={cancelEdit} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors dark:bg-red-900/30 dark:text-red-400">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(c)} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )
                    )}
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

