import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import type { Expense, ExpenseCategory } from '@/types';
import {
  Wallet,
  Plus,
  Search,
  Trash2,
  DollarSign,
  Home,
  Zap,
  Droplets,
  Sparkles,
  MoreHorizontal,
  Users,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const expenseCategories: { value: ExpenseCategory; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'salary', label: 'salary_expense', icon: Users, color: 'hsl(var(--chart-1))' },
  { value: 'rent', label: 'rent', icon: Home, color: 'hsl(var(--chart-2))' },
  { value: 'electricity', label: 'electricity', icon: Zap, color: 'hsl(var(--chart-3))' },
  { value: 'water', label: 'water', icon: Droplets, color: 'hsl(var(--chart-4))' },
  { value: 'cleaning', label: 'cleaning', icon: Sparkles, color: 'hsl(var(--chart-5))' },
  { value: 'miscellaneous', label: 'miscellaneous', icon: MoreHorizontal, color: 'hsl(var(--muted-foreground))' },
];

// Mock expenses
const mockExpenses: Expense[] = [
  { id: '1', category: 'salary', description: 'Staff salaries - November', amount: 48000, date: new Date(), shopId: 'shop-001', createdBy: 'owner-001', createdAt: new Date() },
  { id: '2', category: 'rent', description: 'Shop rent - November', amount: 25000, date: new Date(), shopId: 'shop-001', createdBy: 'owner-001', createdAt: new Date() },
  { id: '3', category: 'electricity', description: 'Electric bill', amount: 3500, date: new Date(), shopId: 'shop-001', createdBy: 'owner-001', createdAt: new Date() },
  { id: '4', category: 'water', description: 'Water bill', amount: 800, date: new Date(), shopId: 'shop-001', createdBy: 'owner-001', createdAt: new Date() },
  { id: '5', category: 'cleaning', description: 'Cleaning supplies', amount: 1200, date: new Date(), shopId: 'shop-001', createdBy: 'owner-001', createdAt: new Date() },
];

export default function ExpenseManagement() {
  const { t } = useTranslation();
  const [expenses, setExpenses] = useState<Expense[]>(mockExpenses);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [form, setForm] = useState({
    category: 'miscellaneous' as ExpenseCategory,
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });

  const filteredExpenses = expenses.filter(e => {
    const matchSearch = e.description.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === 'all' || e.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const expensesByCategory = expenseCategories.map(cat => ({
    name: t(cat.label),
    value: expenses.filter(e => e.category === cat.value).reduce((sum, e) => sum + e.amount, 0),
    color: cat.color,
  })).filter(item => item.value > 0);

  const handleDelete = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
    toast({ title: 'Expense deleted' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newExpense: Expense = {
      id: Date.now().toString(),
      category: form.category,
      description: form.description,
      amount: parseFloat(form.amount),
      date: new Date(form.date),
      shopId: 'shop-001',
      createdBy: 'owner-001',
      createdAt: new Date(),
    };

    setExpenses([newExpense, ...expenses]);
    toast({ title: t('expense_added') });
    setIsDialogOpen(false);
    setForm({
      category: 'miscellaneous',
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const getCategoryIcon = (category: ExpenseCategory) => {
    const cat = expenseCategories.find(c => c.value === category);
    return cat?.icon || MoreHorizontal;
  };

  return (
    <RoleLayout allowedRoles={['owner']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t('expenses')}</h1>
            <p className="text-muted-foreground">Track and manage your business expenses</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t('add_expense')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('add_expense')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category">{t('expense_category')} *</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as ExpenseCategory })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <div className="flex items-center gap-2">
                            <cat.icon className="h-4 w-4" />
                            {t(cat.label)}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Input
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">{t('amount')} (ETB) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {t('cancel')}
                  </Button>
                  <Button type="submit">{t('add')}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Expenses</p>
                    <p className="text-2xl font-bold">{totalExpenses.toLocaleString()} ETB</p>
                  </div>
                  <div className="p-3 rounded-xl bg-destructive/10 text-destructive">
                    <TrendingDown className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">This Month Revenue</p>
                    <p className="text-2xl font-bold">156,420 ETB</p>
                  </div>
                  <div className="p-3 rounded-xl bg-success/10 text-success">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Net Profit</p>
                    <p className="text-2xl font-bold">{(156420 - totalExpenses).toLocaleString()} ETB</p>
                  </div>
                  <div className="p-3 rounded-xl bg-primary/10 text-primary">
                    <DollarSign className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Chart & Filters */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Expenses by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensesByCategory}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {expensesByCategory.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value.toLocaleString()} ETB`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Table */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <CardTitle className="flex items-center gap-2 flex-1">
                    <Wallet className="h-5 w-5" />
                    Recent Expenses
                  </CardTitle>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 w-40"
                      />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {expenseCategories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>{t(cat.label)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('expense_category')}</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">{t('amount')}</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">{t('actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExpenses.map((expense) => {
                        const Icon = getCategoryIcon(expense.category);
                        return (
                          <TableRow key={expense.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                                <Badge variant="outline">{t(expense.category === 'salary' ? 'salary_expense' : expense.category)}</Badge>
                              </div>
                            </TableCell>
                            <TableCell>{expense.description}</TableCell>
                            <TableCell className="text-right font-medium">{expense.amount.toLocaleString()} ETB</TableCell>
                            <TableCell>{format(new Date(expense.date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(expense.id)} className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </RoleLayout>
  );
}
