import 'package:flutter/material.dart';

class OwnerExpensesPage extends StatefulWidget {
  const OwnerExpensesPage({super.key});

  @override
  State<OwnerExpensesPage> createState() => _OwnerExpensesPageState();
}

class _OwnerExpensesPageState extends State<OwnerExpensesPage> {
  final TextEditingController _searchController = TextEditingController();
  String _categoryFilter = 'All';

  // Placeholder counts (TODO: fetch real values from API)
  double todaysSales = 0;
  int alertsCount = 0;
  int assetsCount = 0;

  // For now keep an in-memory list to show "No expenses recorded yet."; future: wire to backend
  final List<Map<String, dynamic>> _expenses = [];

  final List<String> _categories = [
    'All',
    'Salary',
    'Rent',
    'Electricity',
    'Water',
    'Cleaning',
    'Miscellaneous',
  ];

  @override
  Widget build(BuildContext context) {
    final isEmpty = _expenses.isEmpty;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text(
                      'Expenses',
                      style: TextStyle(
                          fontSize: 28, fontWeight: FontWeight.bold),
                    ),
                    SizedBox(height: 6),
                    Text(
                      'Track and manage your business expenses',
                      style: TextStyle(fontSize: 14, color: Colors.grey),
                    ),
                  ],
                ),
              ),

              // Add Expense Button
              ElevatedButton.icon(
                onPressed: _openAddExpenseDialog,
                icon: const Icon(Icons.add),
                label: const Text('Add Expense'),
                style: ElevatedButton.styleFrom(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),

          // Top Totals (expanded)
          Wrap(
            runSpacing: 12,
            spacing: 12,
            children: [
              _buildSummaryCard('Total Expenses', '0 ETB', Icons.trending_down,
                  Colors.red.shade100),
              _buildSummaryCard('This Month Revenue', '0 ETB',
                  Icons.trending_up, Colors.green.shade100),
              _buildSummaryCard("Today's Sales", '${todaysSales.toStringAsFixed(0)} ETB', Icons.attach_money, Colors.blue.shade50),
              _buildSummaryCard('Alerts', '$alertsCount', Icons.notifications, Colors.orange.shade50),
              _buildSummaryCard('Assets', '$assetsCount', Icons.shopping_bag, Colors.purple.shade50),
            ],
          ),

          const SizedBox(height: 18),

          // Main content - two columns
          LayoutBuilder(builder: (context, constraints) {
            final narrow = constraints.maxWidth < 800;
            if (narrow) {
              // Column layout for narrow screens
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Card(
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                    child: Padding(
                      padding: const EdgeInsets.all(18),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            'Expenses by Category',
                            style: TextStyle(
                                fontSize: 20, fontWeight: FontWeight.bold),
                          ),
                          SizedBox(height: 14),
                          SizedBox(
                            height: 220,
                            child: Center(
                              child: Text(
                                '—',
                                style: TextStyle(color: Colors.grey),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 12),

                  // Recent Expenses (full width)
                  Card(
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                    child: Padding(
                      padding: const EdgeInsets.all(18),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          LayoutBuilder(builder: (c, box) {
                            final narrowHeader = box.maxWidth < 520;
                            if (narrowHeader) {
                              return Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  const Text('Recent Expenses', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 10),
                                  TextField(
                                    controller: _searchController,
                                    decoration: InputDecoration(
                                      hintText: 'Search...',
                                      prefixIcon: const Icon(Icons.search),
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      isDense: true,
                                      contentPadding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                                    ),
                                    onChanged: (_) => setState(() {}),
                                  ),
                                  const SizedBox(height: 8),
                                  ConstrainedBox(
                                    constraints: const BoxConstraints(maxWidth: 100),
                                    child: PopupMenuButton<String>(
                                      initialValue: _categoryFilter,
                                      onSelected: (v) => setState(() => _categoryFilter = v),
                                      itemBuilder: (ctx) => _categories
                                          .where((c) => c != 'All')
                                          .map((c) => PopupMenuItem(value: c, child: Text(c)))
                                          .toList(),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Flexible(child: Text(_categoryFilter, overflow: TextOverflow.ellipsis)),
                                          const SizedBox(width: 6),
                                          const Icon(Icons.arrow_drop_down),
                                        ],
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  Container(
                                    decoration: BoxDecoration(
                                      border: Border(
                                          bottom: BorderSide(
                                              color: Colors.grey.shade300, width: 1)),
                                    ),
                                    padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 2),
                                    child: Row(
                                      children: [
                                        Expanded(flex: 2, child: Text('Cat', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, color: Colors.grey.shade700))),
                                        Expanded(flex: 3, child: Text('Desc', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, color: Colors.grey.shade700))),
                                        Expanded(child: Text('Amt', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, color: Colors.grey.shade700))),
                                        SizedBox(width: 70, child: Text('Date', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, color: Colors.grey.shade700))),
                                        SizedBox(width: 70, child: Text('Act', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, color: Colors.grey.shade700))),
                                      ],
                                    ),
                                  ),
                                ],
                              );
                            }

                            // Wide header
                            return Row(
                              children: [
                                Expanded(
                                  child: const Text(
                                    'Recent Expenses',
                                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                                  ),
                                ),
                                Flexible(
                                  child: Wrap(
                                    spacing: 12,
                                    runSpacing: 6,
                                    crossAxisAlignment: WrapCrossAlignment.center,
                                    children: [
                                      ConstrainedBox(
                                        constraints: const BoxConstraints(maxWidth: 220, minWidth: 64),
                                        child: TextField(
                                          controller: _searchController,
                                          decoration: InputDecoration(
                                            hintText: 'Search...',
                                            prefixIcon: const Icon(Icons.search),
                                            border: OutlineInputBorder(
                                              borderRadius: BorderRadius.circular(8),
                                            ),
                                            isDense: true,
                                            contentPadding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                                          ),
                                          onChanged: (_) => setState(() {}),
                                        ),
                                      ),
                                      ConstrainedBox(
                                        constraints: const BoxConstraints(maxWidth: 100),
                                        child: PopupMenuButton<String>(
                                          initialValue: _categoryFilter,
                                          onSelected: (v) => setState(() => _categoryFilter = v),
                                          itemBuilder: (ctx) => _categories
                                              .where((c) => c != 'All')
                                              .map((c) => PopupMenuItem(value: c, child: Text(c)))
                                              .toList(),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Flexible(child: Text(_categoryFilter, overflow: TextOverflow.ellipsis)),
                                              const SizedBox(width: 6),
                                              const Icon(Icons.arrow_drop_down),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            );
                          }),

                          const SizedBox(height: 12),

                          const SizedBox(height: 18),

                          if (isEmpty)
                            Container(
                              height: 140,
                              alignment: Alignment.center,
                              child: const Text(
                                'No expenses recorded yet.',
                                style: TextStyle(color: Colors.grey),
                              ),
                            )
                          else ..._buildExpenseRows(),

                          const SizedBox(height: 8),

                          if (!isEmpty)
                            Align(
                              alignment: Alignment.centerRight,
                              child: TextButton(
                                onPressed: () {},
                                child: const Text('Show More'),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                ],
              );
            }

            // Wide layout (Row)
            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Left - Expenses by Category
                Flexible(
                  flex: 1,
                  child: SizedBox(
                    width: 300,
                    child: Card(
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                      child: Padding(
                        padding: const EdgeInsets.all(18),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: const [
                            Text(
                              'Expenses by Category',
                              style: TextStyle(
                                  fontSize: 20, fontWeight: FontWeight.bold),
                            ),
                            SizedBox(height: 14),
                            // Placeholder for chart / list
                            SizedBox(
                              height: 220,
                              child: Center(
                                child: Text(
                                  '—',
                                  style: TextStyle(color: Colors.grey),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),

                const SizedBox(width: 16),

                // Right - Recent Expenses
                Expanded(
                  flex: 2,
                  child: Card(
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                    child: Padding(
                      padding: const EdgeInsets.all(18),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: const Text(
                                  'Recent Expenses',
                                  style: TextStyle(
                                      fontSize: 20, fontWeight: FontWeight.bold),
                                ),
                              ),
                              Flexible(
                                child: Wrap(
                                  spacing: 12,
                                  runSpacing: 6,
                                  crossAxisAlignment: WrapCrossAlignment.center,
                                  children: [
                                    ConstrainedBox(
                                      constraints: const BoxConstraints(maxWidth: 220, minWidth: 64),
                                      child: TextField(
                                        controller: _searchController,
                                        decoration: InputDecoration(
                                          hintText: 'Search...',
                                          prefixIcon: const Icon(Icons.search),
                                          border: OutlineInputBorder(
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          isDense: true,
                                          contentPadding: const EdgeInsets.symmetric(
                                              vertical: 10, horizontal: 12),
                                        ),
                                        onChanged: (_) => setState(() {}),
                                      ),
                                    ),
                                    ConstrainedBox(
                                      constraints: const BoxConstraints(maxWidth: 100),
                                      child: PopupMenuButton<String>(
                                        initialValue: _categoryFilter,
                                        onSelected: (v) => setState(() => _categoryFilter = v),
                                        itemBuilder: (ctx) => _categories
                                            .where((c) => c != 'All')
                                            .map((c) => PopupMenuItem(value: c, child: Text(c)))
                                            .toList(),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Flexible(child: Text(_categoryFilter, overflow: TextOverflow.ellipsis)),
                                            const SizedBox(width: 6),
                                            const Icon(Icons.arrow_drop_down),
                                          ],
                                        ),
                                      ),
                                    )
                                  ],
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 12),

                          // Table header (compact)
                          Container(
                            decoration: BoxDecoration(
                              border: Border(
                                  bottom: BorderSide(
                                      color: Colors.grey.shade300, width: 1)),
                            ),
                            padding: const EdgeInsets.symmetric(
                                vertical: 8, horizontal: 2),
                            child: Row(
                              children: [
                                Expanded(flex: 2, child: Text('Cat', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, color: Colors.grey.shade700))),
                                Expanded(flex: 3, child: Text('Desc', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, color: Colors.grey.shade700))),
                                Expanded(child: Text('Amt', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, color: Colors.grey.shade700))),
                                SizedBox(width: 70, child: Text('Date', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, color: Colors.grey.shade700))),
                                SizedBox(width: 70, child: Text('Act', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, color: Colors.grey.shade700))),
                              ],
                            ),
                          ),

                          const SizedBox(height: 18),

                          // Content
                          if (isEmpty)
                            Container(
                              height: 140,
                              alignment: Alignment.center,
                              child: const Text(
                                'No expenses recorded yet.',
                                style: TextStyle(color: Colors.grey),
                              ),
                            )
                          else ..._buildExpenseRows(),

                          const SizedBox(height: 8),

                          // Footer / pagination placeholder
                          if (!isEmpty)
                            Align(
                              alignment: Alignment.centerRight,
                              child: TextButton(
                                onPressed: () {},
                                child: const Text('Show More'),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            );
          }),
        ],
      ),
    );
  }

  List<Widget> _buildExpenseRows() {
    // For now returns empty; when _expenses has items we'll build rows
    return _expenses.map((e) {
      return Column(
        children: [
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(flex: 2, child: Text(e['category'] ?? '', maxLines: 1, overflow: TextOverflow.ellipsis)),
              Expanded(flex: 3, child: Text(e['description'] ?? '', maxLines: 1, overflow: TextOverflow.ellipsis)),
              Expanded(child: Text('${e['amount'] ?? ''}', maxLines: 1, overflow: TextOverflow.ellipsis)),
              SizedBox(width: 80, child: Text('${e['date'] ?? ''}', maxLines: 1, overflow: TextOverflow.ellipsis)),
              SizedBox(
                width: 80,
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () {},
                      icon: const Icon(Icons.delete_outline),
                    ),
                  ],
                ),
              )
            ],
          ),
          const Divider(),
        ],
      );
    }).toList();
  }

  Widget _buildSummaryCard(String title, String value, IconData icon, Color bg) {
    return Container(
      width: 320,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // smaller title so it fits on narrow screens
                Text(title, style: TextStyle(color: Colors.grey.shade700, fontSize: 12), maxLines: 1, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 6),
                // value scales down if needed
                FittedBox(alignment: Alignment.centerLeft, fit: BoxFit.scaleDown, child: Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold))),
              ],
            ),
          ),
          Container(
            decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
            padding: const EdgeInsets.all(8),
            child: Icon(icon, color: Colors.black54),
          )
        ],
      ),
    );
  }

  void _openAddExpenseDialog() {
    showDialog(
      context: context,
      builder: (context) {
        final _formKey = GlobalKey<FormState>();
        final _description = TextEditingController();
        final _amount = TextEditingController();
        String _selectedCategory = _categories.length > 1 ? _categories[1] : 'Miscellaneous';

        return AlertDialog(
          title: const Text('Add Expense'),
          content: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<String>(
                  value: _selectedCategory,
                  items: _categories
                      .where((c) => c != 'All')
                      .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                      .toList(),
                  onChanged: (v) => _selectedCategory = v ?? _selectedCategory,
                  decoration: const InputDecoration(labelText: 'Category'),
                ),
                TextFormField(
                  controller: _description,
                  decoration: const InputDecoration(labelText: 'Description'),
                  validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null,
                ),
                TextFormField(
                  controller: _amount,
                  decoration: const InputDecoration(labelText: 'Amount (ETB)'),
                  keyboardType: TextInputType.number,
                  validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () {
                if (_formKey.currentState?.validate() ?? false) {
                  setState(() {
                    _expenses.insert(0, {
                      'category': _selectedCategory,
                      'description': _description.text.trim(),
                      'amount': double.tryParse(_amount.text) ?? 0,
                      'date': DateTime.now().toString().split(' ')[0],
                    });
                  });
                  Navigator.pop(context);
                }
              },
              child: const Text('Add'),
            ),
          ],
        );
      },
    );
  }
}
