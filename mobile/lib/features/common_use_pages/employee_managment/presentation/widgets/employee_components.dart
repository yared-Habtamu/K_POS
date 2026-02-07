import 'package:flutter/material.dart';
import '../../domain/employee_model.dart';
import '../../employee_utils.dart';

// --- Header & Navigation ---

class TopTabs extends StatelessWidget {
  final int index;
  final ValueChanged<int> onChanged;
  const TopTabs({super.key, required this.index, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    Widget tab(String label, int i) {
      final selected = index == i;
      return InkWell(
        onTap: () => onChanged(i),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: selected ? Colors.blue.shade900 : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            label,
            style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: selected ? Colors.white : Colors.grey.shade800),
          ),
        ),
      );
    }

    return Row(children: [
      tab('Employees', 0),
      const SizedBox(width: 8),
      tab('Attendance', 1)
    ]);
  }
}

class SectionHeader extends StatelessWidget {
  final String title;
  final String subtitle;
  final String? buttonLabel;
  final VoidCallback? onPressed;
  final Widget? rightActions;

  const SectionHeader(
      {super.key,
      required this.title,
      required this.subtitle,
      this.buttonLabel,
      this.onPressed,
      this.rightActions});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, constraints) {
      final isNarrow = constraints.maxWidth < 650;
      final titleWidget = Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade700,
            ),
          ),
        ],
      );
      final btn = buttonLabel == null
          ? null
          : ElevatedButton.icon(
              onPressed: onPressed,
              icon: const Icon(Icons.add, size: 18),
              label: Text(buttonLabel!),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue.shade900,
                foregroundColor: Colors.white,
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            );
      final actions = rightActions ?? btn;
      if (isNarrow) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            titleWidget,
            if (actions != null) ...[const SizedBox(height: 10), actions]
          ],
        );
      }
      return Row(children: [
        Expanded(child: titleWidget),
        if (actions != null) actions
      ]);
    });
  }
}

class SearchAndRoleFilter extends StatelessWidget {
  final TextEditingController controller;
  final List<String> roles;
  final String selectedRole;
  final ValueChanged<String> onRoleChanged;
  final ValueChanged<String> onQueryChanged;

  const SearchAndRoleFilter({
    super.key,
    required this.controller,
    required this.roles,
    required this.selectedRole,
    required this.onRoleChanged,
    required this.onQueryChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.shade300)),
      child: LayoutBuilder(builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 700;
        final search = Container(
          height: 46,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.grey.shade300)),
          child: Row(children: [
            Icon(Icons.search, color: Colors.grey.shade700),
            const SizedBox(width: 10),
            Expanded(
                child: TextField(
                    controller: controller,
                    onChanged: onQueryChanged,
                    decoration: const InputDecoration(
                        hintText: 'Search employees...',
                        border: InputBorder.none))),
          ]),
        );
        final role = Container(
          height: 46,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.grey.shade300)),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              isExpanded: true,
              value: selectedRole,
              items: roles
                  .map((r) => DropdownMenuItem(
                      value: r,
                      child: Text(r,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                              fontSize: 13,
                              color: Colors.grey.shade800,
                              fontWeight: FontWeight.w700))))
                  .toList(),
              onChanged: (v) => {if (v != null) onRoleChanged(v)},
            ),
          ),
        );
        if (isNarrow) {
          return Column(children: [search, const SizedBox(height: 12), role]);
        }
        return Row(children: [
          Expanded(child: search),
          const SizedBox(width: 12),
          SizedBox(width: 180, child: role)
        ]);
      }),
    );
  }
}

// --- Tables ---

class EmployeesTable extends StatelessWidget {
  final List<Employee> items;
  final int totalCount;
  final void Function(Employee) onEdit;
  final void Function(Employee) onDelete;

  const EmployeesTable(
      {super.key,
      required this.items,
      required this.totalCount,
      required this.onEdit,
      required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final headerStyle = TextStyle(
        fontSize: 12, fontWeight: FontWeight.w700, color: Colors.grey.shade700);
    final columns = [
      DataColumn(label: Text('Employee Name', style: headerStyle)),
      DataColumn(label: Text('Phone', style: headerStyle)),
      DataColumn(label: Text('Role', style: headerStyle)),
      DataColumn(label: Text('Salary', style: headerStyle)),
      DataColumn(label: Text('Status', style: headerStyle)),
      DataColumn(label: Text('Actions', style: headerStyle)),
    ];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.shade300)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(Icons.groups, size: 18, color: Colors.grey.shade800),
            const SizedBox(width: 8),
            Text('Employees',
                style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: Colors.grey.shade900)),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: Colors.grey.shade300)),
              child: Text('$totalCount',
                  style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: Colors.grey.shade800)),
            ),
          ]),
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.grey.shade200)),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: DataTable(
                  headingRowHeight: 44,
                  dataRowMinHeight: 54,
                  dataRowMaxHeight: 66,
                  horizontalMargin: 16,
                  columnSpacing: 26,
                  dividerThickness: 0.6,
                  columns: columns,
                  rows: items
                      .map((e) => DataRow(cells: [
                            DataCell(NameCell(name: e.name)),
                            DataCell(Text(e.phone,
                                style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600))),
                            DataCell(RoleChip(role: e.role)),
                            DataCell(Text(e.salaryText,
                                style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600))),
                            DataCell(StatusChip(active: e.active)),
                            DataCell(
                                Row(mainAxisSize: MainAxisSize.min, children: [
                              IconButton(
                                  onPressed: () => onEdit(e),
                                  icon:
                                      const Icon(Icons.edit_outlined, size: 18),
                                  color: Colors.grey.shade700),
                              IconButton(
                                  onPressed: () => onDelete(e),
                                  icon: const Icon(Icons.delete_outline,
                                      size: 18),
                                  color: Colors.red.shade400),
                            ])),
                          ]))
                      .toList(),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// --- Permissions ---

class PermissionsSection extends StatelessWidget {
  final List<Employee> employees;
  // State maps passed down from parent
  final Map<String, bool> managerApplyDiscount;
  final Map<String, bool> managerAddItemsWithPrice;
  final Map<String, bool> storeManageQty;
  final Map<String, bool> cashierApplyDiscount;
  // Callbacks
  final Function(String, bool) onManagerDiscount;
  final Function(String, bool) onManagerAddItems;
  final Function(String, bool) onStoreManageQty;
  final Function(String, bool) onCashierDiscount;

  const PermissionsSection({
    super.key,
    required this.employees,
    required this.managerApplyDiscount,
    required this.managerAddItemsWithPrice,
    required this.storeManageQty,
    required this.cashierApplyDiscount,
    required this.onManagerDiscount,
    required this.onManagerAddItems,
    required this.onStoreManageQty,
    required this.onCashierDiscount,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.shade300)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(Icons.key, size: 18, color: Colors.grey.shade800),
            const SizedBox(width: 8),
            Text('Manage Permissions',
                style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: Colors.grey.shade900))
          ]),
          const SizedBox(height: 4),
          Text('Control which actions each employee is allowed to perform.',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade700)),
          const SizedBox(height: 14),
          _buildGroup(
              'Manager Permissions',
              'Assign manager-level permissions',
              employees
                  .where((e) => e.role.toLowerCase().contains('manager'))
                  .map((e) => _PermissionRow(
                      name: e.name,
                      label1: 'Apply Discounts',
                      val1: managerApplyDiscount[e.id] ?? false,
                      on1: (v) => onManagerDiscount(e.id, v),
                      label2: 'Add Items (w/ Price)',
                      val2: managerAddItemsWithPrice[e.id] ?? false,
                      on2: (v) => onManagerAddItems(e.id, v)))
                  .toList()),
          const SizedBox(height: 14),
          _buildGroup(
              'Store Keeper Permissions',
              'Assign warehouse permissions',
              employees
                  .where((e) => e.role.toLowerCase().contains('store') && e.role.toLowerCase().contains('keeper'))
                  .map((e) => _PermissionRow(
                      name: e.name,
                      label1: 'Manage Quantity',
                      val1: storeManageQty[e.id] ?? false,
                      on1: (v) => onStoreManageQty(e.id, v)))
                  .toList()),
          const SizedBox(height: 14),
          _buildGroup(
              'Cashier Permissions',
              'Assign front-desk permissions',
              employees
                  .where((e) => e.role.toLowerCase().contains('cashier'))
                  .map((e) => _PermissionRow(
                      name: e.name,
                      label1: 'Apply Discounts',
                      val1: cashierApplyDiscount[e.id] ?? false,
                      on1: (v) => onCashierDiscount(e.id, v)))
                  .toList()),
        ],
      ),
    );
  }

  Widget _buildGroup(
    String title,
    String subtitle,
    List<Widget> children,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w800,
            color: Colors.grey.shade900,
          ),
        ),
        Text(
          subtitle,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey.shade700,
          ),
        ),
        const SizedBox(height: 10),
        ...children.map(
          (c) => Padding(padding: const EdgeInsets.only(bottom: 10), child: c),
        ),
      ],
    );
  }
}

class _PermissionRow extends StatelessWidget {
  final String name;
  final String label1;
  final bool val1;
  final ValueChanged<bool> on1;
  final String? label2;
  final bool? val2;
  final ValueChanged<bool>? on2;

  const _PermissionRow(
      {required this.name,
      required this.label1,
      required this.val1,
      required this.on1,
      this.label2,
      this.val2,
      this.on2});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
          color: Colors.grey.shade50,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.grey.shade300)),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isNarrow = constraints.maxWidth < 700;
          final nameW = Text(name,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: Colors.grey.shade900));

          Widget switchRow(String lbl, bool val, ValueChanged<bool> cb) => Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    lbl,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade700,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Switch(
                    value: val,
                    onChanged: cb,
                    activeThumbColor: Colors.white,
                    activeTrackColor: Colors.blue.shade900,
                    inactiveThumbColor: Colors.white,
                    inactiveTrackColor: Colors.grey.shade300,
                  ),
                ],
              );

          if (isNarrow) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                nameW,
                const SizedBox(height: 8),
                switchRow(label1, val1, on1),
                if (label2 != null) ...[
                  const SizedBox(height: 8),
                  switchRow(label2!, val2 ?? false, on2!)
                ]
              ],
            );
          }
          return Row(
            children: [
              Expanded(child: nameW),
              switchRow(label1, val1, on1),
              if (label2 != null) ...[
                const SizedBox(width: 16),
                switchRow(label2!, val2 ?? false, on2!)
              ]
            ],
          );
        },
      ),
    );
  }
}
