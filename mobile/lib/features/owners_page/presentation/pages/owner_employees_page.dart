import 'package:flutter/material.dart';

class OwnerEmployeesPage extends StatefulWidget {
  final bool hideOtherManagers;
  final String? currentUserId;
  final List<String>? allowedRoles;

  const OwnerEmployeesPage({
    super.key,
    this.hideOtherManagers = false,
    this.currentUserId,
    this.allowedRoles,
  });

  @override
  State<OwnerEmployeesPage> createState() => _OwnerEmployeesPageState();
}

class _OwnerEmployeesPageState extends State<OwnerEmployeesPage> {
  final _searchController = TextEditingController();

  // Nullable to be resilient to hot reload (initState may not run).
  List<_EmployeeRow>? _employees;

  int _tabIndex = 0; // 0: Employees, 1: Attendance
  String _query = '';
  String _roleFilter = 'All Roles';

  // Attendance (filters + manual add + date nav)
  String _attendanceEmployeeFilter = 'All Employees';
  String _attendanceDateRange = 'Today';
  String _manualEmployee = 'Select Employee';
  DateTime _manualDate = DateTime(2026, 1, 1);
  TimeOfDay? _manualClockIn;
  TimeOfDay? _manualClockOut;
  DateTime _recordsDate = DateTime(2026, 1, 1);

  // mock permissions state
  final Map<String, bool> _managerApplyDiscount = {};
  final Map<String, bool> _managerAddItemsWithPrice = {};
  final Map<String, bool> _storeManageQty = {};
  final Map<String, bool> _cashierApplyDiscount = {};

  @override
  void initState() {
    super.initState();

    _employees ??= List<_EmployeeRow>.of(_mockEmployees());

    // Seed default toggle values so UI looks “on/off” like screenshot.
    _seedPermissionsFor(_employees!);
  }

  void _seedPermissionsFor(List<_EmployeeRow> employees) {
    for (final e in employees) {
      if (e.role == 'Manager') {
        _managerApplyDiscount.putIfAbsent(e.id, () => true);
        _managerAddItemsWithPrice.putIfAbsent(e.id, () => false);
      }
      if (e.role == 'Store Keeper') {
        _storeManageQty.putIfAbsent(e.id, () => false);
      }
      if (e.role == 'Cashier') {
        _cashierApplyDiscount.putIfAbsent(e.id, () => false);
      }
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _toast(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
    );
  }

  Future<void> _openAddEmployeeDialog() async {
    final result = await showDialog<_AddEmployeeResult>(
      context: context,
      barrierDismissible: false,
      builder: (context) => const _AddEmployeeDialog(),
    );

    if (result == null) return;

    _employees ??= List<_EmployeeRow>.of(_mockEmployees());

    final newId = DateTime.now().millisecondsSinceEpoch.toString();
    final salaryText =
        '${result.salary.trim().isEmpty ? '0' : result.salary.trim()} ETB';

    final newEmployee = _EmployeeRow(
      id: newId,
      name: result.employeeName.trim(),
      phone: result.phone.trim(),
      role: result.role,
      salaryText: salaryText,
      active: true,
    );

    setState(() {
      _employees!.insert(0, newEmployee);
      _seedPermissionsFor([newEmployee]);
    });

    _toast('Employee added (mock)');
  }

  Future<void> _pickManualDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _manualDate,
      firstDate: DateTime(2020, 1, 1),
      lastDate: DateTime(2035, 12, 31),
    );
    if (picked == null) return;
    setState(() => _manualDate = picked);
  }

  Future<void> _pickClockIn() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _manualClockIn ?? const TimeOfDay(hour: 9, minute: 0),
    );
    if (picked == null) return;
    setState(() => _manualClockIn = picked);
  }

  Future<void> _pickClockOut() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _manualClockOut ?? const TimeOfDay(hour: 17, minute: 0),
    );
    if (picked == null) return;
    setState(() => _manualClockOut = picked);
  }

  @override
  Widget build(BuildContext context) {
    var baseAll = _employees ??= List<_EmployeeRow>.of(_mockEmployees());

    // If allowedRoles is set (e.g. managers should only see certain roles), filter first
    if (widget.allowedRoles != null) {
      final allowed = widget.allowedRoles!;
      baseAll = baseAll.where((e) => allowed.contains(e.role)).toList();
    }

    // When used in manager view, hide other managers (keep current user if manager)
    final all = widget.hideOtherManagers && widget.currentUserId != null
        ? baseAll
            .where(
                (e) => !(e.role == 'Manager' && e.id != widget.currentUserId))
            .toList()
        : baseAll;

    _seedPermissionsFor(all);

    final roles = <String>{'All Roles', ...all.map((e) => e.role)}.toList();

    final q = _query.trim().toLowerCase();
    final filtered = all.where((e) {
      final matchesQuery = q.isEmpty ||
          e.name.toLowerCase().contains(q) ||
          e.phone.toLowerCase().contains(q);
      final matchesRole = _roleFilter == 'All Roles' || e.role == _roleFilter;
      return matchesQuery && matchesRole;
    }).toList();

    // Match screenshot footer: showing 1-7 of 11
    final pageItems = filtered.take(7).toList();

    final employeeOptions =
        <String>{'All Employees', ...all.map((e) => e.name)}.toList();
    final dateRanges = const <String>[
      'Today',
      'This Week',
      'This Month',
      'Custom'
    ];

    final records = _mockAttendanceRecords();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _TopTabs(
            index: _tabIndex,
            onChanged: (i) => setState(() => _tabIndex = i),
          ),
          const SizedBox(height: 12),
          if (_tabIndex == 0) ...[
            _Header(
              title: 'Employees',
              subtitle: 'Manage your team members',
              buttonLabel: 'Add Employee',
              onPressed: _openAddEmployeeDialog,
              rightActions: null,
            ),
            const SizedBox(height: 14),
            _SearchAndRoleRow(
              controller: _searchController,
              roles: roles,
              selectedRole: _roleFilter,
              onRoleChanged: (v) => setState(() => _roleFilter = v),
              onQueryChanged: (v) => setState(() => _query = v),
            ),
            const SizedBox(height: 14),
            _EmployeesTableCard(items: pageItems, totalCount: filtered.length),
            const SizedBox(height: 14),
            _PermissionsCard(
              employees: all,
              managerApplyDiscount: _managerApplyDiscount,
              managerAddItemsWithPrice: _managerAddItemsWithPrice,
              storeManageQty: _storeManageQty,
              cashierApplyDiscount: _cashierApplyDiscount,
              onToggleManagerDiscount: (id, v) =>
                  setState(() => _managerApplyDiscount[id] = v),
              onToggleManagerAddItemsWithPrice: (id, v) =>
                  setState(() => _managerAddItemsWithPrice[id] = v),
              onToggleStoreManageQty: (id, v) =>
                  setState(() => _storeManageQty[id] = v),
              onToggleCashierDiscount: (id, v) =>
                  setState(() => _cashierApplyDiscount[id] = v),
            ),
          ] else ...[
            _Header(
              title: 'Attendance',
              subtitle: 'Track and manage employee attendance',
              buttonLabel: null,
              onPressed: null,
              rightActions: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _ActionButton(
                    icon: Icons.download,
                    label: 'Export CSV',
                    onPressed: () => _toast('Export CSV (mock)'),
                  ),
                  const SizedBox(width: 10),
                  _ActionButton(
                    icon: Icons.picture_as_pdf_outlined,
                    label: 'Export PDF',
                    onPressed: () => _toast('Export PDF (mock)'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            _AttendanceFiltersCard(
              employeeValue: _attendanceEmployeeFilter,
              employeeItems: employeeOptions,
              onEmployeeChanged: (v) =>
                  setState(() => _attendanceEmployeeFilter = v),
              dateRangeValue: _attendanceDateRange,
              dateRangeItems: dateRanges,
              onDateRangeChanged: (v) =>
                  setState(() => _attendanceDateRange = v),
            ),
            const SizedBox(height: 14),
            _AddAttendanceManuallyCard(
              employees:
                  employeeOptions.where((e) => e != 'All Employees').toList(),
              selectedEmployee: _manualEmployee,
              onEmployeeChanged: (v) => setState(() => _manualEmployee = v),
              dateText: _formatYmd(_manualDate),
              onPickDate: _pickManualDate,
              clockInText: _manualClockIn == null
                  ? '--:-- --'
                  : _formatTime(_manualClockIn!),
              clockOutText: _manualClockOut == null
                  ? '--:-- --'
                  : _formatTime(_manualClockOut!),
              onPickClockIn: _pickClockIn,
              onPickClockOut: _pickClockOut,
              onSave: () => _toast('Save Attendance (mock)'),
            ),
            const SizedBox(height: 14),
            _AttendanceRecordsCard(
              recordsDate: _recordsDate,
              onPrevDate: () => setState(() => _recordsDate =
                  _recordsDate.subtract(const Duration(days: 1))),
              onNextDate: () => setState(() =>
                  _recordsDate = _recordsDate.add(const Duration(days: 1))),
              records: records,
            ),
          ],
        ],
      ),
    );
  }
}

class _TopTabs extends StatelessWidget {
  final int index;
  final ValueChanged<int> onChanged;

  const _TopTabs({required this.index, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final selectedBg = Colors.blue.shade900;

    Widget tab(String label, int i) {
      final selected = index == i;
      return InkWell(
        onTap: () => onChanged(i),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: selected ? selectedBg : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: selected ? Colors.white : Colors.grey.shade800,
            ),
          ),
        ),
      );
    }

    return Row(
      children: [
        tab('Employees', 0),
        const SizedBox(width: 8),
        tab('Attendance', 1),
      ],
    );
  }
}

class _Header extends StatelessWidget {
  final String title;
  final String subtitle;
  final String? buttonLabel;
  final VoidCallback? onPressed;
  final Widget? rightActions;

  const _Header({
    required this.title,
    required this.subtitle,
    required this.buttonLabel,
    required this.onPressed,
    required this.rightActions,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 650;

        final titleWidget = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              this.title,
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              style: TextStyle(fontSize: 14, color: Colors.grey.shade700),
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
                      borderRadius: BorderRadius.circular(14)),
                ),
              );

        final actions = rightActions ?? btn;

        if (isNarrow) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              titleWidget,
              if (actions != null) ...[
                const SizedBox(height: 10),
                actions,
              ],
            ],
          );
        }

        return Row(
          children: [
            Expanded(child: titleWidget),
            if (actions != null) actions,
          ],
        );
      },
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onPressed;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, size: 18, color: Colors.grey.shade800),
      label: Text(label),
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        side: BorderSide(color: Colors.grey.shade300),
        foregroundColor: Colors.grey.shade800,
      ),
    );
  }
}

class _AttendanceFiltersCard extends StatelessWidget {
  final String employeeValue;
  final List<String> employeeItems;
  final ValueChanged<String> onEmployeeChanged;
  final String dateRangeValue;
  final List<String> dateRangeItems;
  final ValueChanged<String> onDateRangeChanged;

  const _AttendanceFiltersCard({
    required this.employeeValue,
    required this.employeeItems,
    required this.onEmployeeChanged,
    required this.dateRangeValue,
    required this.dateRangeItems,
    required this.onDateRangeChanged,
  });

  @override
  Widget build(BuildContext context) {
    Widget dropdown(
        String value, List<String> items, ValueChanged<String> onChanged) {
      return Container(
        height: 46,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: DropdownButtonHideUnderline(
          child: DropdownButton<String>(
            isExpanded: true,
            value: value,
            items: items
                .map(
                  (r) => DropdownMenuItem<String>(
                    value: r,
                    child: Text(
                      r,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey.shade800,
                          fontWeight: FontWeight.w700),
                    ),
                  ),
                )
                .toList(),
            onChanged: (v) {
              if (v != null) onChanged(v);
            },
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isNarrow = constraints.maxWidth < 700;

          final employee = Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Employee',
                  style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey.shade800,
                      fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              dropdown(employeeValue, employeeItems, onEmployeeChanged),
            ],
          );

          final range = Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Date Range',
                  style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey.shade800,
                      fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              dropdown(dateRangeValue, dateRangeItems, onDateRangeChanged),
            ],
          );

          if (isNarrow) {
            return Column(
              children: [
                employee,
                const SizedBox(height: 12),
                range,
              ],
            );
          }

          return Row(
            children: [
              Expanded(child: employee),
              const SizedBox(width: 16),
              Expanded(child: range),
            ],
          );
        },
      ),
    );
  }
}

class _AddAttendanceManuallyCard extends StatelessWidget {
  final List<String> employees;
  final String selectedEmployee;
  final ValueChanged<String> onEmployeeChanged;
  final String dateText;
  final VoidCallback onPickDate;
  final String clockInText;
  final String clockOutText;
  final VoidCallback onPickClockIn;
  final VoidCallback onPickClockOut;
  final VoidCallback onSave;

  const _AddAttendanceManuallyCard({
    required this.employees,
    required this.selectedEmployee,
    required this.onEmployeeChanged,
    required this.dateText,
    required this.onPickDate,
    required this.clockInText,
    required this.clockOutText,
    required this.onPickClockIn,
    required this.onPickClockOut,
    required this.onSave,
  });

  @override
  Widget build(BuildContext context) {
    Widget dropdown(
        String value, List<String> items, ValueChanged<String> onChanged) {
      return Container(
        height: 46,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: DropdownButtonHideUnderline(
          child: DropdownButton<String>(
            isExpanded: true,
            value: value,
            items: items
                .map(
                  (r) => DropdownMenuItem<String>(
                    value: r,
                    child: Text(
                      r,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey.shade800,
                          fontWeight: FontWeight.w700),
                    ),
                  ),
                )
                .toList(),
            onChanged: (v) {
              if (v != null) onChanged(v);
            },
          ),
        ),
      );
    }

    Widget field(
        {required String text,
        required IconData icon,
        required VoidCallback onTap}) {
      return InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          height: 46,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.grey.shade300),
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  text,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                      fontSize: 13,
                      color: text.startsWith('--')
                          ? Colors.grey.shade500
                          : Colors.grey.shade800,
                      fontWeight: FontWeight.w700),
                ),
              ),
              const SizedBox(width: 8),
              Icon(icon, size: 18, color: Colors.grey.shade700),
            ],
          ),
        ),
      );
    }

    final employeeItems = <String>['Select Employee', ...employees];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Add Attendance Manually',
              style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: Colors.grey.shade900)),
          const SizedBox(height: 14),
          LayoutBuilder(
            builder: (context, constraints) {
              final isNarrow = constraints.maxWidth < 800;

              final employee = Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Employee',
                      style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey.shade800,
                          fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  dropdown(selectedEmployee, employeeItems, onEmployeeChanged),
                ],
              );

              final date = Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Date',
                      style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey.shade800,
                          fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  field(
                      text: dateText,
                      icon: Icons.calendar_month_outlined,
                      onTap: onPickDate),
                ],
              );

              final clockIn = Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Clock In',
                      style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey.shade800,
                          fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  field(
                      text: clockInText,
                      icon: Icons.access_time,
                      onTap: onPickClockIn),
                ],
              );

              final clockOut = Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Clock Out',
                      style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey.shade800,
                          fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  field(
                      text: clockOutText,
                      icon: Icons.access_time,
                      onTap: onPickClockOut),
                ],
              );

              final save = ElevatedButton(
                onPressed: onSave,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue.shade900,
                  foregroundColor: Colors.white,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14)),
                ),
                child: const Text('Save Attendance'),
              );

              if (isNarrow) {
                return Column(
                  children: [
                    employee,
                    const SizedBox(height: 12),
                    date,
                    const SizedBox(height: 12),
                    clockIn,
                    const SizedBox(height: 12),
                    clockOut,
                    const SizedBox(height: 12),
                    Align(alignment: Alignment.centerLeft, child: save),
                  ],
                );
              }

              return Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(child: employee),
                  const SizedBox(width: 14),
                  Expanded(child: date),
                  const SizedBox(width: 14),
                  Expanded(child: clockIn),
                  const SizedBox(width: 14),
                  Expanded(child: clockOut),
                  const SizedBox(width: 14),
                  save,
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class _AttendanceRecordsCard extends StatelessWidget {
  final DateTime recordsDate;
  final VoidCallback onPrevDate;
  final VoidCallback onNextDate;
  final List<_AttendanceRecordRow> records;

  const _AttendanceRecordsCard({
    required this.recordsDate,
    required this.onPrevDate,
    required this.onNextDate,
    required this.records,
  });

  @override
  Widget build(BuildContext context) {
    final headerStyle = TextStyle(
        fontSize: 12, fontWeight: FontWeight.w700, color: Colors.grey.shade700);
    final columns = <DataColumn>[
      DataColumn(label: Text('Employee', style: headerStyle)),
      DataColumn(label: Text('Date', style: headerStyle)),
      DataColumn(label: Text('Clock In', style: headerStyle)),
      DataColumn(label: Text('Clock Out', style: headerStyle)),
      DataColumn(label: Text('Duration', style: headerStyle)),
      DataColumn(label: Text('Actions', style: headerStyle)),
    ];

    final rows = records
        .map(
          (r) => DataRow(
            cells: [
              DataCell(_NameCell(name: r.employeeName)),
              DataCell(Text(r.dateYmd,
                  style: const TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w600))),
              DataCell(Text(r.clockIn,
                  style: const TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w600))),
              DataCell(Text(r.clockOut,
                  style: const TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w600))),
              DataCell(Text(r.duration,
                  style: const TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w600))),
              DataCell(
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      onPressed: () {},
                      icon: const Icon(Icons.edit_outlined, size: 18),
                      color: Colors.grey.shade700,
                      tooltip: 'Edit (mock)',
                    ),
                    IconButton(
                      onPressed: () {},
                      icon: const Icon(Icons.delete_outline, size: 18),
                      color: Colors.red.shade400,
                      tooltip: 'Delete (mock)',
                    ),
                  ],
                ),
              ),
            ],
          ),
        )
        .toList();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LayoutBuilder(
            builder: (context, constraints) {
              final isNarrow = constraints.maxWidth < 520;

              final titleRow = Row(
                children: [
                  Expanded(
                    child: Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 12,
                      runSpacing: 6,
                      children: [
                        Text(
                          'Attendance Records',
                          style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                              color: Colors.grey.shade900),
                        ),
                        Text(
                          'Showing ${records.length} records',
                          style: TextStyle(
                              fontSize: 12, color: Colors.grey.shade700),
                        ),
                      ],
                    ),
                  ),
                ],
              );

              final dateNavRow = Row(
                children: [
                  IconButton(
                    onPressed: onPrevDate,
                    icon: const Icon(Icons.chevron_left),
                    color: Colors.grey.shade700,
                  ),
                  Expanded(
                    child: Center(
                      child: Text(
                        _formatYmd(recordsDate),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: Colors.grey.shade800),
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: onNextDate,
                    icon: const Icon(Icons.chevron_right),
                    color: Colors.grey.shade700,
                  ),
                ],
              );

              if (isNarrow) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    titleRow,
                    const SizedBox(height: 8),
                    dateNavRow,
                  ],
                );
              }

              return Row(
                children: [
                  Expanded(child: titleRow),
                  const SizedBox(width: 10),
                  SizedBox(width: 280, child: dateNavRow),
                ],
              );
            },
          ),
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.grey.shade200),
            ),
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
                  rows: rows,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SearchAndRoleRow extends StatelessWidget {
  final TextEditingController controller;
  final List<String> roles;
  final String selectedRole;
  final ValueChanged<String> onRoleChanged;
  final ValueChanged<String> onQueryChanged;

  const _SearchAndRoleRow({
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
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isNarrow = constraints.maxWidth < 700;

          final search = Container(
            height: 46,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.grey.shade300),
            ),
            child: Row(
              children: [
                Icon(Icons.search, color: Colors.grey.shade700),
                const SizedBox(width: 10),
                Expanded(
                  child: TextField(
                    controller: controller,
                    onChanged: onQueryChanged,
                    decoration: const InputDecoration(
                      hintText: 'Search employees...',
                      border: InputBorder.none,
                    ),
                  ),
                ),
              ],
            ),
          );

          final role = Container(
            height: 46,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.grey.shade300),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                isExpanded: true,
                value: selectedRole,
                items: roles
                    .map(
                      (r) => DropdownMenuItem<String>(
                        value: r,
                        child: Text(
                          r,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                              fontSize: 13,
                              color: Colors.grey.shade800,
                              fontWeight: FontWeight.w700),
                        ),
                      ),
                    )
                    .toList(),
                onChanged: (v) {
                  if (v != null) onRoleChanged(v);
                },
              ),
            ),
          );

          if (isNarrow) {
            return Column(
              children: [
                search,
                const SizedBox(height: 12),
                role,
              ],
            );
          }

          return Row(
            children: [
              Expanded(child: search),
              const SizedBox(width: 12),
              SizedBox(width: 180, child: role),
            ],
          );
        },
      ),
    );
  }
}

class _EmployeesTableCard extends StatelessWidget {
  final List<_EmployeeRow> items;
  final int totalCount;

  const _EmployeesTableCard({required this.items, required this.totalCount});

  @override
  Widget build(BuildContext context) {
    final headerStyle = TextStyle(
        fontSize: 12, fontWeight: FontWeight.w700, color: Colors.grey.shade700);

    final columns = <DataColumn>[
      DataColumn(label: Text('Employee Name', style: headerStyle)),
      DataColumn(label: Text('Phone', style: headerStyle)),
      DataColumn(label: Text('Role', style: headerStyle)),
      DataColumn(label: Text('Salary', style: headerStyle)),
      DataColumn(label: Text('Status', style: headerStyle)),
      DataColumn(label: Text('Actions', style: headerStyle)),
    ];

    final rows = items
        .map(
          (e) => DataRow(
            cells: [
              DataCell(_NameCell(name: e.name)),
              DataCell(_PhoneCell(phone: e.phone)),
              DataCell(_RoleChip(role: e.role)),
              DataCell(Text(e.salaryText,
                  style: const TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w600))),
              DataCell(_StatusChip(active: e.active)),
              DataCell(
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      onPressed: () {},
                      icon: const Icon(Icons.edit_outlined, size: 18),
                      color: Colors.grey.shade700,
                      tooltip: 'Edit (mock)',
                    ),
                    IconButton(
                      onPressed: () {},
                      icon: const Icon(Icons.delete_outline, size: 18),
                      color: Colors.red.shade400,
                      tooltip: 'Delete (mock)',
                    ),
                  ],
                ),
              ),
            ],
          ),
        )
        .toList();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
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
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: Text(
                  '$totalCount',
                  style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: Colors.grey.shade800),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.grey.shade200),
            ),
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
                  rows: rows,
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          _FooterPager(showing: items.length, total: totalCount),
        ],
      ),
    );
  }
}

class _FooterPager extends StatelessWidget {
  final int showing;
  final int total;

  const _FooterPager({required this.showing, required this.total});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 650;

        final left = Text(
          'Showing 1-$showing of $total employees',
          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
        );

        final pager = Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _PagerButton(label: 'Prev', enabled: false, onPressed: () {}),
            const SizedBox(width: 6),
            _PagePill(label: '1', selected: true, onTap: () {}),
            const SizedBox(width: 6),
            _PagePill(label: '2', selected: false, onTap: () {}),
            const SizedBox(width: 6),
            _PagerButton(label: 'Next', enabled: true, onPressed: () {}),
          ],
        );

        if (isNarrow) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              left,
              const SizedBox(height: 10),
              pager,
            ],
          );
        }

        return Row(
          children: [
            Expanded(child: left),
            pager,
          ],
        );
      },
    );
  }
}

class _PagerButton extends StatelessWidget {
  final String label;
  final bool enabled;
  final VoidCallback onPressed;

  const _PagerButton(
      {required this.label, required this.enabled, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: enabled ? onPressed : null,
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        side: BorderSide(color: Colors.grey.shade300),
        foregroundColor: Colors.grey.shade800,
      ),
      child: Text(label),
    );
  }
}

class _PagePill extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _PagePill(
      {required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final fg = selected ? Colors.white : Colors.grey.shade800;
    final bg = selected ? Colors.blue.shade900 : Colors.white;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        width: 34,
        height: 34,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: Text(label,
            style: TextStyle(color: fg, fontWeight: FontWeight.w800)),
      ),
    );
  }
}

class _NameCell extends StatelessWidget {
  final String name;

  const _NameCell({required this.name});

  @override
  Widget build(BuildContext context) {
    final initial =
        name.trim().isEmpty ? '?' : name.trim().substring(0, 1).toUpperCase();

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 30,
          height: 30,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: Colors.grey.shade200,
            shape: BoxShape.circle,
          ),
          child: Text(
            initial,
            style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: Colors.grey.shade800),
          ),
        ),
        const SizedBox(width: 10),
        Text(name,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
      ],
    );
  }
}

class _PhoneCell extends StatelessWidget {
  final String phone;

  const _PhoneCell({required this.phone});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.phone, size: 14, color: Colors.grey.shade700),
        const SizedBox(width: 6),
        Text(phone,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
      ],
    );
  }
}

class _RoleChip extends StatelessWidget {
  final String role;

  const _RoleChip({required this.role});

  @override
  Widget build(BuildContext context) {
    final normalized = role.trim();

    final isOwner = normalized == 'Owner';
    final isManager = normalized == 'Manager';

    final bg = isOwner
        ? Colors.grey.shade100
        : isManager
            ? Colors.blue.shade900
            : Colors.grey.shade100;

    final fg = isManager ? Colors.white : Colors.grey.shade800;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Text(
        normalized,
        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: fg),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final bool active;

  const _StatusChip({required this.active});

  @override
  Widget build(BuildContext context) {
    final label = active ? 'active' : 'inactive';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Text(
        label,
        style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w800,
            color: Colors.grey.shade800),
      ),
    );
  }
}

class _PermissionsCard extends StatelessWidget {
  final List<_EmployeeRow> employees;

  final Map<String, bool> managerApplyDiscount;
  final Map<String, bool> managerAddItemsWithPrice;
  final Map<String, bool> storeManageQty;
  final Map<String, bool> cashierApplyDiscount;

  final void Function(String id, bool v) onToggleManagerDiscount;
  final void Function(String id, bool v) onToggleManagerAddItemsWithPrice;
  final void Function(String id, bool v) onToggleStoreManageQty;
  final void Function(String id, bool v) onToggleCashierDiscount;

  const _PermissionsCard({
    required this.employees,
    required this.managerApplyDiscount,
    required this.managerAddItemsWithPrice,
    required this.storeManageQty,
    required this.cashierApplyDiscount,
    required this.onToggleManagerDiscount,
    required this.onToggleManagerAddItemsWithPrice,
    required this.onToggleStoreManageQty,
    required this.onToggleCashierDiscount,
  });

  @override
  Widget build(BuildContext context) {
    final managers = employees.where((e) => e.role == 'Manager').toList();
    final storeKeepers =
        employees.where((e) => e.role == 'Store Keeper').toList();
    final cashiers = employees.where((e) => e.role == 'Cashier').toList();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.key, size: 18, color: Colors.grey.shade800),
              const SizedBox(width: 8),
              Text('Manage Permissions',
                  style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: Colors.grey.shade900)),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Control which actions each employee is allowed to perform in the POS system.',
            style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
          ),
          const SizedBox(height: 14),
          _PermissionGroup(
            title: 'Manager Permissions',
            subtitle: 'Assign manager-level permissions',
            rows: managers
                .map(
                  (e) => _PermissionRow(
                    name: e.name.split(' ').first.toLowerCase(),
                    rightLabel1: 'Apply Discounts',
                    switch1Value: managerApplyDiscount[e.id] ?? false,
                    onSwitch1: (v) => onToggleManagerDiscount(e.id, v),
                    rightLabel2: 'Add Items (w/ Price)',
                    switch2Value: managerAddItemsWithPrice[e.id] ?? false,
                    onSwitch2: (v) => onToggleManagerAddItemsWithPrice(e.id, v),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 14),
          _PermissionGroup(
            title: 'Store Keeper Permissions',
            subtitle: 'Assign warehouse permissions',
            rows: storeKeepers
                .map(
                  (e) => _PermissionRow(
                    name: e.name.split(' ').first.toLowerCase(),
                    rightLabel1: 'Manage Quantity',
                    switch1Value: storeManageQty[e.id] ?? false,
                    onSwitch1: (v) => onToggleStoreManageQty(e.id, v),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: 14),
          _PermissionGroup(
            title: 'Cashier Permissions',
            subtitle: 'Assign front-desk permissions',
            rows: cashiers
                .map(
                  (e) => _PermissionRow(
                    name: e.name.split(' ').first.toLowerCase(),
                    rightLabel1: 'Apply Discounts',
                    switch1Value: cashierApplyDiscount[e.id] ?? false,
                    onSwitch1: (v) => onToggleCashierDiscount(e.id, v),
                  ),
                )
                .toList(),
          ),
        ],
      ),
    );
  }
}

class _PermissionGroup extends StatelessWidget {
  final String title;
  final String subtitle;
  final List<_PermissionRow> rows;

  const _PermissionGroup({
    required this.title,
    required this.subtitle,
    required this.rows,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title,
            style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: Colors.grey.shade900)),
        const SizedBox(height: 2),
        Text(subtitle,
            style: TextStyle(fontSize: 12, color: Colors.grey.shade700)),
        const SizedBox(height: 10),
        ...rows.map(
          (r) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: r,
          ),
        ),
      ],
    );
  }
}

class _PermissionRow extends StatelessWidget {
  final String name;

  final String rightLabel1;
  final bool switch1Value;
  final ValueChanged<bool> onSwitch1;

  final String? rightLabel2;
  final bool? switch2Value;
  final ValueChanged<bool>? onSwitch2;

  const _PermissionRow({
    required this.name,
    required this.rightLabel1,
    required this.switch1Value,
    required this.onSwitch1,
    this.rightLabel2,
    this.switch2Value,
    this.onSwitch2,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isNarrow = constraints.maxWidth < 700;

          final left = Expanded(
            child: Text(
              name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: Colors.grey.shade900),
            ),
          );

          final first = Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(rightLabel1,
                  style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade700,
                      fontWeight: FontWeight.w600)),
              const SizedBox(width: 10),
              Switch(
                value: switch1Value,
                onChanged: onSwitch1,
                activeColor: Colors.white,
                activeTrackColor: Colors.blue.shade900,
                inactiveThumbColor: Colors.white,
                inactiveTrackColor: Colors.grey.shade300,
              ),
            ],
          );

          final second = rightLabel2 == null
              ? const SizedBox.shrink()
              : Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      rightLabel2!,
                      style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade700,
                          fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(width: 10),
                    Switch(
                      value: switch2Value ?? false,
                      onChanged: onSwitch2,
                      activeColor: Colors.white,
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
                Row(children: [left]),
                const SizedBox(height: 8),
                first,
                if (rightLabel2 != null) ...[
                  const SizedBox(height: 8),
                  second,
                ],
              ],
            );
          }

          return Row(
            children: [
              left,
              first,
              if (rightLabel2 != null) ...[
                const SizedBox(width: 16),
                second,
              ],
            ],
          );
        },
      ),
    );
  }
}

class _EmployeeRow {
  final String id;
  final String name;
  final String phone;
  final String role;
  final String salaryText;
  final bool active;

  const _EmployeeRow({
    required this.id,
    required this.name,
    required this.phone,
    required this.role,
    required this.salaryText,
    required this.active,
  });
}

class _AttendanceRecordRow {
  final String employeeName;
  final String dateYmd;
  final String clockIn;
  final String clockOut;
  final String duration;

  const _AttendanceRecordRow({
    required this.employeeName,
    required this.dateYmd,
    required this.clockIn,
    required this.clockOut,
    required this.duration,
  });
}

List<_AttendanceRecordRow> _mockAttendanceRecords() {
  return const [
    _AttendanceRecordRow(
      employeeName: 'Yared Abebe',
      dateYmd: '2026-01-01',
      clockIn: '04:50 AM',
      clockOut: '04:55 AM',
      duration: '5 min',
    ),
  ];
}

String _formatYmd(DateTime d) {
  String two(int n) => n.toString().padLeft(2, '0');
  return '${d.year}-${two(d.month)}-${two(d.day)}';
}

String _formatTime(TimeOfDay t) {
  final h = t.hour;
  final m = t.minute.toString().padLeft(2, '0');
  final isPm = h >= 12;
  final hour12 = (h % 12 == 0) ? 12 : (h % 12);
  final ampm = isPm ? 'PM' : 'AM';
  return '${hour12.toString().padLeft(2, '0')}:$m $ampm';
}

class _AddEmployeeResult {
  final String username;
  final String employeeName;
  final String phone;
  final String role;
  final String salary;
  final String password;

  const _AddEmployeeResult({
    required this.username,
    required this.employeeName,
    required this.phone,
    required this.role,
    required this.salary,
    required this.password,
  });
}

class _AddEmployeeDialog extends StatefulWidget {
  const _AddEmployeeDialog();

  @override
  State<_AddEmployeeDialog> createState() => _AddEmployeeDialogState();
}

class _AddEmployeeDialogState extends State<_AddEmployeeDialog> {
  final _usernameController = TextEditingController();
  final _employeeNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _salaryController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  String _role = 'Manager';

  @override
  void dispose() {
    _usernameController.dispose();
    _employeeNameController.dispose();
    _phoneController.dispose();
    _salaryController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _toast(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
    );
  }

  void _save() {
    final username = _usernameController.text.trim();
    final employeeName = _employeeNameController.text.trim();
    final phone = _phoneController.text.trim();
    final salary = _salaryController.text.trim();
    final password = _passwordController.text;
    final confirm = _confirmPasswordController.text;

    if (employeeName.isEmpty) {
      _toast('Employee Name is required');
      return;
    }
    if (phone.isEmpty) {
      _toast('Phone is required');
      return;
    }
    if (salary.isEmpty) {
      _toast('Salary is required');
      return;
    }
    if (password.isEmpty) {
      _toast('Password is required');
      return;
    }
    if (password != confirm) {
      _toast('Passwords do not match');
      return;
    }

    Navigator.of(context).pop(
      _AddEmployeeResult(
        username: username,
        employeeName: employeeName,
        phone: phone,
        role: _role,
        salary: salary,
        password: password,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final roles = const ['Manager', 'Cashier', 'Store Keeper'];

    Widget labeled(String label, Widget child, {bool required = false}) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            required ? '$label *' : label,
            style: TextStyle(
                fontSize: 13,
                color: Colors.grey.shade900,
                fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          child,
        ],
      );
    }

    Widget input({
      required TextEditingController controller,
      required String hint,
      TextInputType? keyboardType,
      bool obscure = false,
    }) {
      return Container(
        height: 48,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: Center(
          child: TextField(
            controller: controller,
            keyboardType: keyboardType,
            obscureText: obscure,
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: TextStyle(color: Colors.grey.shade500),
              border: InputBorder.none,
              isCollapsed: true,
            ),
          ),
        ),
      );
    }

    Widget dropdown({
      required String value,
      required List<String> items,
      required ValueChanged<String> onChanged,
    }) {
      return Container(
        height: 48,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: DropdownButtonHideUnderline(
          child: DropdownButton<String>(
            isExpanded: true,
            value: value,
            icon: Icon(Icons.keyboard_arrow_down_rounded,
                color: Colors.grey.shade700),
            items: items
                .map(
                  (r) => DropdownMenuItem<String>(
                    value: r,
                    child: Text(
                      r,
                      style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey.shade900,
                          fontWeight: FontWeight.w700),
                    ),
                  ),
                )
                .toList(),
            onChanged: (v) {
              if (v != null) onChanged(v);
            },
          ),
        ),
      );
    }

    final dialogChild = Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Add Employee',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                ),
              ),
              IconButton(
                onPressed: () => Navigator.of(context).pop(),
                icon: Icon(Icons.close, color: Colors.grey.shade700),
                tooltip: 'Close',
              ),
            ],
          ),
          const SizedBox(height: 14),
          labeled(
            'Username (optional)',
            input(
                controller: _usernameController,
                hint: 'login username (optional)'),
          ),
          const SizedBox(height: 14),
          labeled(
            'Employee Name',
            input(controller: _employeeNameController, hint: ''),
            required: true,
          ),
          const SizedBox(height: 14),
          labeled(
            'Phone',
            input(
                controller: _phoneController,
                hint: '+251...',
                keyboardType: TextInputType.phone),
            required: true,
          ),
          const SizedBox(height: 14),
          labeled(
            'Role',
            dropdown(
              value: _role,
              items: roles,
              onChanged: (v) => setState(() => _role = v),
            ),
            required: true,
          ),
          const SizedBox(height: 14),
          labeled(
            'Salary (ETB)',
            input(
                controller: _salaryController,
                hint: '',
                keyboardType: TextInputType.number),
            required: true,
          ),
          const SizedBox(height: 14),
          labeled(
            'Password',
            input(controller: _passwordController, hint: '', obscure: true),
            required: true,
          ),
          const SizedBox(height: 12),
          input(
              controller: _confirmPasswordController,
              hint: 'Confirm password',
              obscure: true),
          const SizedBox(height: 18),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              OutlinedButton(
                onPressed: () => Navigator.of(context).pop(),
                style: OutlinedButton.styleFrom(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14)),
                  side: BorderSide(color: Colors.grey.shade300),
                  foregroundColor: Colors.grey.shade800,
                ),
                child: const Text('Cancel'),
              ),
              const SizedBox(width: 10),
              ElevatedButton(
                onPressed: _save,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue.shade900,
                  foregroundColor: Colors.white,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14)),
                ),
                child: const Text('Save'),
              ),
            ],
          ),
        ],
      ),
    );

    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      backgroundColor: Colors.transparent,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 820),
        child: Material(
          color: Colors.transparent,
          child: SingleChildScrollView(
            child: dialogChild,
          ),
        ),
      ),
    );
  }
}

List<_EmployeeRow> _mockEmployees() {
  return const [
    _EmployeeRow(
      id: 'e1',
      name: 'Yared Abebe',
      phone: '+251936092577',
      role: 'Owner',
      salaryText: '0 ETB',
      active: true,
    ),
    _EmployeeRow(
      id: 'e2',
      name: 'kebede',
      phone: '+251936092578',
      role: 'Cashier',
      salaryText: '3,000 ETB',
      active: true,
    ),
    _EmployeeRow(
      id: 'e3',
      name: 'kebede',
      phone: '+251936092579',
      role: 'Manager',
      salaryText: '3,000 ETB',
      active: true,
    ),
    _EmployeeRow(
      id: 'e4',
      name: 'kiya',
      phone: '+251936092575',
      role: 'Cashier',
      salaryText: '2,000 ETB',
      active: true,
    ),
    _EmployeeRow(
      id: 'e5',
      name: 'chala',
      phone: '0949986167',
      role: 'Store Keeper',
      salaryText: '10,000 ETB',
      active: true,
    ),
    _EmployeeRow(
      id: 'e6',
      name: 'kaleb',
      phone: '0949986169',
      role: 'Cashier',
      salaryText: '10,000 ETB',
      active: true,
    ),
    _EmployeeRow(
      id: 'e7',
      name: 'aberu',
      phone: '0949986169',
      role: 'Store Keeper',
      salaryText: '9,000 ETB',
      active: true,
    ),
    _EmployeeRow(
      id: 'e8',
      name: 'Sami',
      phone: '0911111111',
      role: 'Manager',
      salaryText: '8,000 ETB',
      active: true,
    ),
    _EmployeeRow(
      id: 'e9',
      name: 'yared s',
      phone: '0922222222',
      role: 'Store Keeper',
      salaryText: '7,000 ETB',
      active: true,
    ),
    _EmployeeRow(
      id: 'e10',
      name: 'kiya1',
      phone: '0933333333',
      role: 'Cashier',
      salaryText: '2,200 ETB',
      active: true,
    ),
    _EmployeeRow(
      id: 'e11',
      name: 'YaredF',
      phone: '0944444444',
      role: 'Cashier',
      salaryText: '2,500 ETB',
      active: true,
    ),
  ];
}
