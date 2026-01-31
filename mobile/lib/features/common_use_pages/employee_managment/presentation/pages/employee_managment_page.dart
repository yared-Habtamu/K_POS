import 'package:flutter/material.dart';
import 'package:pos_app/features/common_use_pages/employee_managment/presentation/widgets/attendance_components.dart';

import '../../domain/employee_model.dart';
import '../../employee_utils.dart';
import '../widgets/add_employee_dialog.dart';
import '../widgets/employee_components.dart';

class CommonEmployeeManagementPage extends StatefulWidget {
  final bool hideOtherManagers;
  final String? currentUserId;
  final List<String>? allowedRoles;

  const CommonEmployeeManagementPage({
    super.key,
    this.hideOtherManagers = false,
    this.currentUserId,
    this.allowedRoles,
  });

  @override
  State<CommonEmployeeManagementPage> createState() =>
      _CommonEmployeeManagementPageState();
}

class _CommonEmployeeManagementPageState
    extends State<CommonEmployeeManagementPage> {
  final _searchController = TextEditingController();

  // Data State (Later, this moves to BLoC State)
  List<Employee> _employees = [];
  Map<String, bool> _managerApplyDiscount = {};
  Map<String, bool> _managerAddItemsWithPrice = {};
  Map<String, bool> _storeManageQty = {};
  Map<String, bool> _cashierApplyDiscount = {};
  List<AttendanceRecord> _attendanceRecords = [];

  // UI State
  int _tabIndex = 0;
  String _query = '';
  String _roleFilter = 'All Roles';

  // -- Attendance State --
  String _attendanceEmployeeFilter = 'All Employees';
  String _attendanceDateRange = 'Today';
  String _manualEmployee = 'Select Employee';
  DateTime _manualDate = DateTime.now();
  TimeOfDay? _manualClockIn;
  TimeOfDay? _manualClockOut;
  DateTime _recordsDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  void _loadInitialData() {
    _employees = List.of(mockEmployees());
    _attendanceRecords = List.of(mockAttendanceRecords());
    _seedPermissions(_employees);
  }

  void _seedPermissions(List<Employee> list) {
    for (final e in list) {
      if (e.role == 'Manager') {
        _managerApplyDiscount.putIfAbsent(e.id, () => true);
        _managerAddItemsWithPrice.putIfAbsent(e.id, () => false);
      } else if (e.role == 'Store Keeper') {
        _storeManageQty.putIfAbsent(e.id, () => false);
      } else if (e.role == 'Cashier') {
        _cashierApplyDiscount.putIfAbsent(e.id, () => false);
      }
    }
  }

  Future<void> _onAddEmployee() async {
    final result = await showDialog<AddEmployeeFormData>(
      context: context,
      barrierDismissible: false,
      builder: (context) => const AddEmployeeDialog(),
    );

    if (result != null) {
      setState(() {
        final newEmp = Employee(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          name: result.employeeName,
          phone: result.phone,
          role: result.role,
          salaryText: '${result.salary} ETB',
          active: true,
        );
        _employees.insert(0, newEmp);
        _seedPermissions([newEmp]);
      });
      EmployeeUtils.toast(context, 'Employee Added');
    }
  }

  // -- Date Pickers --
  Future<void> _pickManualDate() async {
    final picked = await showDatePicker(
        context: context,
        initialDate: _manualDate,
        firstDate: DateTime(2020),
        lastDate: DateTime(2035));
    if (picked != null) setState(() => _manualDate = picked);
  }

  Future<void> _pickClockIn() async {
    final picked = await showTimePicker(
        context: context,
        initialTime: _manualClockIn ?? const TimeOfDay(hour: 9, minute: 0));
    if (picked != null) setState(() => _manualClockIn = picked);
  }

  Future<void> _pickClockOut() async {
    final picked = await showTimePicker(
        context: context,
        initialTime: _manualClockOut ?? const TimeOfDay(hour: 17, minute: 0));
    if (picked != null) setState(() => _manualClockOut = picked);
  }

  List<Employee> _getFilteredEmployees() {
    var list = List<Employee>.from(_employees);

    // 1. Filter by allowed roles prop
    if (widget.allowedRoles != null) {
      list = list.where((e) => widget.allowedRoles!.contains(e.role)).toList();
    }

    // 2. Hide other managers logic
    if (widget.hideOtherManagers && widget.currentUserId != null) {
      list = list
          .where((e) => !(e.role == 'Manager' && e.id != widget.currentUserId))
          .toList();
    }

    // 3. Search & Dropdown Filter
    final q = _query.trim().toLowerCase();
    return list.where((e) {
      final matchesQuery =
          q.isEmpty || e.name.toLowerCase().contains(q) || e.phone.contains(q);
      final matchesRole = _roleFilter == 'All Roles' || e.role == _roleFilter;
      return matchesQuery && matchesRole;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final displayList = _getFilteredEmployees();
    final roleOptions = ['All Roles', ..._employees.map((e) => e.role).toSet()];
    final employeeNames = ['All Employees', ..._employees.map((e) => e.name)];
    final employeeNamesManual = _employees.map((e) => e.name).toList();

    return Scaffold(
      backgroundColor: Colors.white,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TopTabs(
                index: _tabIndex,
                onChanged: (i) => setState(() => _tabIndex = i)),
            const SizedBox(height: 12),
            if (_tabIndex == 0) ...[
              // --- Employees Tab ---
              SectionHeader(
                title: 'Employees',
                subtitle: 'Manage your team members',
                buttonLabel: 'Add Employee',
                onPressed: _onAddEmployee,
              ),
              const SizedBox(height: 14),
              SearchAndRoleFilter(
                controller: _searchController,
                roles: roleOptions,
                selectedRole: _roleFilter,
                onRoleChanged: (v) => setState(() => _roleFilter = v),
                onQueryChanged: (v) => setState(() => _query = v),
              ),
              const SizedBox(height: 14),
              EmployeesTable(
                items: displayList,
                totalCount: displayList.length,
              ),
              const SizedBox(height: 14),
              PermissionsSection(
                employees: displayList,
                managerApplyDiscount: _managerApplyDiscount,
                managerAddItemsWithPrice: _managerAddItemsWithPrice,
                storeManageQty: _storeManageQty,
                cashierApplyDiscount: _cashierApplyDiscount,
                onManagerDiscount: (id, v) =>
                    setState(() => _managerApplyDiscount[id] = v),
                onManagerAddItems: (id, v) =>
                    setState(() => _managerAddItemsWithPrice[id] = v),
                onStoreManageQty: (id, v) =>
                    setState(() => _storeManageQty[id] = v),
                onCashierDiscount: (id, v) =>
                    setState(() => _cashierApplyDiscount[id] = v),
              ),
            ] else ...[
              // --- Attendance Tab Implementation ---

              SectionHeader(
                title: 'Attendance',
                subtitle: 'Track and manage employee attendance',
                rightActions: Row(mainAxisSize: MainAxisSize.min, children: [
                  OutlinedButton.icon(
                      onPressed: () => EmployeeUtils.toast(context, 'CSV'),
                      icon: const Icon(Icons.download, size: 16),
                      label: const Text("Export CSV")),
                  const SizedBox(width: 10),
                  OutlinedButton.icon(
                      onPressed: () => EmployeeUtils.toast(context, 'PDF'),
                      icon: const Icon(Icons.picture_as_pdf, size: 16),
                      label: const Text("Export PDF")),
                ]),
              ),
              const SizedBox(height: 14),

              AttendanceFiltersCard(
                employeeValue: _attendanceEmployeeFilter,
                employeeItems: employeeNames.toList(),
                onEmployeeChanged: (v) =>
                    setState(() => _attendanceEmployeeFilter = v),
                dateRangeValue: _attendanceDateRange,
                dateRangeItems: const ['Today', 'This Week', 'This Month'],
                onDateRangeChanged: (v) =>
                    setState(() => _attendanceDateRange = v),
              ),
              const SizedBox(height: 14),

              AddAttendanceManuallyCard(
                employees: employeeNamesManual,
                selectedEmployee: _manualEmployee,
                onEmployeeChanged: (v) => setState(() => _manualEmployee = v),
                dateText: EmployeeUtils.formatYmd(_manualDate),
                onPickDate: _pickManualDate,
                clockInText: _manualClockIn == null
                    ? '--:-- --'
                    : EmployeeUtils.formatTime(_manualClockIn!),
                clockOutText: _manualClockOut == null
                    ? '--:-- --'
                    : EmployeeUtils.formatTime(_manualClockOut!),
                onPickClockIn: _pickClockIn,
                onPickClockOut: _pickClockOut,
                onSave: () => EmployeeUtils.toast(context, 'Attendance Saved'),
              ),
              const SizedBox(height: 14),

              AttendanceRecordsCard(
                recordsDate: _recordsDate,
                onPrevDate: () => setState(() => _recordsDate =
                    _recordsDate.subtract(const Duration(days: 1))),
                onNextDate: () => setState(() =>
                    _recordsDate = _recordsDate.add(const Duration(days: 1))),
                records: _attendanceRecords,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
