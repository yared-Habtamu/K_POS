import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';

class OwnerExpensesPage extends StatefulWidget {
  const OwnerExpensesPage({super.key});

  @override
  State<OwnerExpensesPage> createState() => _OwnerExpensesPageState();
}

class _Expense {
  final String category;
  final String description;
  final double amount;
  final DateTime date;

  _Expense(
      {required this.category,
      required this.description,
      required this.amount,
      required this.date});
}

class _OwnerExpensesPageState extends State<OwnerExpensesPage> {
  final List<_Expense> _expenses = [
    _Expense(
        category: 'Salary',
        description: 'total dec',
        amount: 90000,
        date: DateTime(2025, 12, 10)),
    _Expense(
        category: 'Electricity',
        description: 'Weekly',
        amount: 9000,
        date: DateTime(2025, 12, 5)),
    _Expense(
        category: 'Rent',
        description: 'Monthly rent',
        amount: 100000,
        date: DateTime(2025, 12, 5)),
  ];

  double get totalExpenses => _expenses.fold(0.0, (p, e) => p + e.amount);

  double monthRevenue = 432; // mock value from screenshot

  void _openAddExpense() async {
    final added = await showDialog<_Expense?>(
      context: context,
      builder: (context) => _AddExpenseDialog(),
    );

    if (added != null) {
      setState(() => _expenses.insert(0, added));
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Expense added')));
    }
  }

  void _deleteExpense(int index) {
    setState(() => _expenses.removeAt(index));
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('Expense deleted')));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return LayoutBuilder(builder: (context, constraints) {
      final isWide = constraints.maxWidth >= 800;

      return SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Expenses',
                          style: theme.textTheme.headlineLarge
                              ?.copyWith(fontWeight: FontWeight.w800)),
                      const SizedBox(height: 6),
                      Text('Track and manage your business expenses',
                          style: theme.textTheme.bodyMedium
                              ?.copyWith(color: Colors.grey.shade700)),
                    ],
                  ),
                ),
                ElevatedButton.icon(
                  onPressed: _openAddExpense,
                  icon: const Icon(Icons.add),
                  label: const Text('Add Expense'),
                  style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue.shade900),
                )
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                    child: _StatCard(
                        title: 'Total Expenses',
                        value: '${totalExpenses.toStringAsFixed(0)} ETB')),
                const SizedBox(width: 12),
                Expanded(
                    child: _StatCard(
                        title: 'This Month Revenue',
                        value: '${monthRevenue.toStringAsFixed(0)} ETB')),
              ],
            ),
            const SizedBox(height: 16),
            if (isWide)
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: _CategoryChart(expenses: _expenses)),
                  const SizedBox(width: 12),
                  Expanded(
                      child: _RecentExpensesList(
                          expenses: _expenses, onDelete: _deleteExpense)),
                ],
              )
            else ...[
              _CategoryChart(expenses: _expenses),
              const SizedBox(height: 12),
              _RecentExpensesList(
                  expenses: _expenses, onDelete: _deleteExpense),
            ],
          ],
        ),
      );
    });
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  const _StatCard({required this.title, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade300)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title,
            style: TextStyle(
                fontSize: 13,
                color: Colors.grey.shade700,
                fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        Text(value,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
      ]),
    );
  }
}

class _CategoryChart extends StatelessWidget {
  final List<_Expense> expenses;
  const _CategoryChart({required this.expenses});

  Map<String, double> _aggregate() {
    final Map<String, double> m = {};
    for (final e in expenses) {
      m[e.category] = (m[e.category] ?? 0) + e.amount;
    }
    return m;
  }

  static const List<Color> _palette = [
    Color(0xFF1677FF),
    Color(0xFF7C3AED),
    Color(0xFFF59E0B),
    Color(0xFF10B981),
    Color(0xFFFB7185),
    Color(0xFF60A5FA)
  ];

  @override
  Widget build(BuildContext context) {
    final agg = _aggregate();
    final total = agg.values.fold(0.0, (p, v) => p + v);
    final sections = <PieChartSectionData>[];
    var i = 0;
    for (final entry in agg.entries) {
      final value = entry.value;
      final percent = total == 0 ? 0.0 : (value / total) * 100;
      sections.add(PieChartSectionData(
        color: _palette[i % _palette.length],
        value: value,
        radius: 48,
        title: '',
        showTitle: false,
        titleStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
      ));
      i++;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade300)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Expenses by Category',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          SizedBox(
            height: 200,
            child: Center(
              child: total == 0
                  ? const Text('No data')
                  : PieChart(
                      PieChartData(
                        sections: sections,
                        centerSpaceRadius: 36,
                        sectionsSpace: 6,
                        startDegreeOffset: -90,
                      ),
                    ),
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            children: agg.keys
                .toList()
                .asMap()
                .entries
                .map((e) => Row(mainAxisSize: MainAxisSize.min, children: [
                      Container(
                          width: 12,
                          height: 12,
                          color: _palette[e.key % _palette.length]),
                      const SizedBox(width: 6),
                      Text(e.value)
                    ]))
                .toList(),
          )
        ],
      ),
    );
  }
}

class _RecentExpensesList extends StatelessWidget {
  final List<_Expense> expenses;
  final void Function(int index) onDelete;

  const _RecentExpensesList({required this.expenses, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade300)),
      child: LayoutBuilder(builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 520;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (!isNarrow)
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                const Text('Recent Expenses',
                    style:
                        TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                Row(children: [
                  Container(
                    width: 180,
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    child: TextField(
                        decoration: InputDecoration(
                            hintText: 'Search...',
                            contentPadding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 12),
                            border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(10)))),
                  ),
                  const SizedBox(width: 8),
                  DropdownButton<String>(
                      value: 'All',
                      items: const [
                        DropdownMenuItem(value: 'All', child: Text('All'))
                      ],
                      onChanged: (_) {})
                ])
              ])
            else ...[
              const Text('Recent Expenses',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              Row(children: [
                Expanded(
                  child: TextField(
                      decoration: InputDecoration(
                          hintText: 'Search...',
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 12),
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10)))),
                ),
                const SizedBox(width: 8),
                DropdownButton<String>(
                    value: 'All',
                    items: const [
                      DropdownMenuItem(value: 'All', child: Text('All'))
                    ],
                    onChanged: (_) {})
              ])
            ],
            const SizedBox(height: 12),
            ...List.generate(expenses.length,
                (i) => _ExpenseTile(expenses[i], onDelete: () => onDelete(i))),
          ],
        );
      }),
    );
  }
}

class _ExpenseTile extends StatelessWidget {
  final _Expense expense;
  final VoidCallback onDelete;
  const _ExpenseTile(this.expense, {required this.onDelete});

  String _fmt(DateTime d) =>
      '${d.month.toString().padLeft(2, '0')}/${d.day.toString().padLeft(2, '0')}/${d.year}';

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        children: [
          Flexible(
              flex: 2,
              child: Text(expense.category,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                  overflow: TextOverflow.ellipsis)),
          const SizedBox(width: 8),
          Flexible(
              flex: 4,
              child:
                  Text(expense.description, overflow: TextOverflow.ellipsis)),
          const SizedBox(width: 8),
          Flexible(
              flex: 2,
              child: Text('${expense.amount.toStringAsFixed(0)} ETB',
                  textAlign: TextAlign.right,
                  style: const TextStyle(fontWeight: FontWeight.w700))),
          const SizedBox(width: 12),
          Flexible(
              flex: 2,
              child: Text(_fmt(expense.date), textAlign: TextAlign.right)),
          const SizedBox(width: 8),
          IconButton(
              onPressed: onDelete,
              icon: const Icon(Icons.delete, color: Colors.red))
        ],
      ),
    );
  }
}

class _AddExpenseDialog extends StatefulWidget {
  @override
  State<_AddExpenseDialog> createState() => _AddExpenseDialogState();
}

class _AddExpenseDialogState extends State<_AddExpenseDialog> {
  final _formKey = GlobalKey<FormState>();
  String _category = 'Miscellaneous';
  final _description = TextEditingController();
  final _amount = TextEditingController();
  DateTime _date = DateTime.now();

  final List<String> _categories = [
    'Rent',
    'Electricity',
    'Salary',
    'Water',
    'Cleaning',
    'Miscellaneous'
  ];

  @override
  void dispose() {
    _description.dispose();
    _amount.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
        context: context,
        initialDate: _date,
        firstDate: DateTime(2000),
        lastDate: DateTime(2100));
    if (picked != null) setState(() => _date = picked);
  }

  void _add() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final amt = double.tryParse(_amount.text.trim()) ?? 0.0;
    final expense = _Expense(
        category: _category,
        description: _description.text.trim(),
        amount: amt,
        date: _date);
    Navigator.of(context).pop(expense);
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('Add Expense',
                    style:
                        TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: _category,
                  items: _categories
                      .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                      .toList(),
                  onChanged: (v) => setState(() => _category = v ?? _category),
                  decoration: const InputDecoration(labelText: 'Category *'),
                ),
                const SizedBox(height: 8),
                TextFormField(
                    controller: _description,
                    decoration:
                        const InputDecoration(labelText: 'Description *'),
                    validator: (v) =>
                        (v ?? '').trim().isEmpty ? 'Required' : null),
                const SizedBox(height: 8),
                TextFormField(
                    controller: _amount,
                    keyboardType: TextInputType.number,
                    decoration:
                        const InputDecoration(labelText: 'Amount (ETB) *'),
                    validator: (v) =>
                        (v ?? '').trim().isEmpty ? 'Required' : null),
                const SizedBox(height: 8),
                GestureDetector(
                  onTap: _pickDate,
                  child: AbsorbPointer(
                    child: TextFormField(
                      decoration: InputDecoration(
                          labelText: 'Date *',
                          hintText:
                              '${_date.month.toString().padLeft(2, '0')}/${_date.day.toString().padLeft(2, '0')}/${_date.year}'),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Row(mainAxisAlignment: MainAxisAlignment.end, children: [
                  TextButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: const Text('Cancel')),
                  const SizedBox(width: 8),
                  ElevatedButton(
                      onPressed: _add,
                      child: const Text('Add'),
                      style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue.shade900)),
                ])
              ]),
        ),
      ),
    );
  }
}
