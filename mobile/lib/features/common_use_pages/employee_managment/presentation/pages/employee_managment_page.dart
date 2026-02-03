import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:pos_app/features/common_use_pages/employee_managment/presentation/widgets/attendance_components.dart';
import 'package:pos_app/features/common_use_pages/employee_managment/presentation/bloc/employee_bloc.dart';
import 'package:pos_app/features/common_use_pages/employee_managment/domain/employee_model.dart';
import '../../employee_utils.dart';
import '../widgets/add_employee_dialog.dart';
import '../widgets/employee_components.dart';
import '../widgets/employee_shimmer_effect.dart';

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

  // Data State
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

  // --- Employee edit/delete handlers ---
  Future<void> _onEditEmployee(Employee emp) async {
    final nameCtrl = TextEditingController(text: emp.name);
    final phoneCtrl = TextEditingController(text: emp.phone);
    String role = emp.role;
    final salaryCtrl = TextEditingController(
        text: emp.salaryText.replaceAll(' ETB', '').replaceAll(',', ''));

    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return Dialog(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Text('Edit Employee',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
              const SizedBox(height: 12),
              TextField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(labelText: 'Name')),
              const SizedBox(height: 8),
              TextField(
                  controller: phoneCtrl,
                  decoration: const InputDecoration(labelText: 'Phone')),
              const SizedBox(height: 8),
              DropdownButton<String>(
                  value: role,
                  items: const [
                    DropdownMenuItem(value: 'Manager', child: Text('Manager')),
                    DropdownMenuItem(value: 'Cashier', child: Text('Cashier')),
                    DropdownMenuItem(
                        value: 'Store Keeper', child: Text('Store Keeper'))
                  ],
                  onChanged: (v) {
                    if (v != null) role = v;
                  }),
              const SizedBox(height: 8),
              TextField(
                  controller: salaryCtrl,
                  decoration: const InputDecoration(labelText: 'Salary')),
              const SizedBox(height: 12),
              Row(mainAxisAlignment: MainAxisAlignment.end, children: [
                TextButton(
                    onPressed: () => Navigator.of(context).pop(false),
                    child: const Text('Cancel')),
                const SizedBox(width: 8),
                ElevatedButton(
                    onPressed: () => Navigator.of(context).pop(true),
                    child: const Text('Save'))
              ])
            ]),
          ),
        );
      },
    );

    if (result == true) {
      setState(() {
        final idx = _employees.indexWhere((e) => e.id == emp.id);
        if (idx >= 0) {
          _employees[idx] = Employee(
            id: emp.id,
            name: nameCtrl.text.trim(),
            phone: phoneCtrl.text.trim(),
            role: role,
            salaryText: '${salaryCtrl.text.trim()} ETB',
            active: emp.active,
          );
        }
      });
      EmployeeUtils.toast(context, 'Employee updated');
      await _saveEmployees();
    }
  }

  Future<void> _onDeleteEmployee(Employee emp) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete employee?'),
        content: Text(
            'Are you sure you want to delete ${emp.name}? This cannot be undone.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel')),
          TextButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Delete', style: TextStyle(color: Colors.red))),
        ],
      ),
    );

    if (confirm == true) {
      setState(() {
        _employees.removeWhere((e) => e.id == emp.id);
        _attendanceRecords.removeWhere((r) => r.employeeName == emp.name);
      });
      EmployeeUtils.toast(context, 'Employee deleted');
      await _saveEmployees();
    }
  }

  // --- Attendance edit/delete handlers ---
  Future<void> _onEditAttendance(AttendanceRecord rec) async {
    final dateCtrl = TextEditingController(text: rec.dateYmd);
    final clockInCtrl = TextEditingController(text: rec.clockIn);
    final clockOutCtrl = TextEditingController(text: rec.clockOut);

    final result = await showDialog<bool>(
      context: context,
      builder: (context) {
        return Dialog(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Text('Edit Attendance',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
              const SizedBox(height: 12),
              TextField(
                  controller: dateCtrl,
                  decoration:
                      const InputDecoration(labelText: 'Date (YYYY-MM-DD)')),
              const SizedBox(height: 8),
              TextField(
                  controller: clockInCtrl,
                  decoration: const InputDecoration(labelText: 'Clock In')),
              const SizedBox(height: 8),
              TextField(
                  controller: clockOutCtrl,
                  decoration: const InputDecoration(labelText: 'Clock Out')),
              const SizedBox(height: 12),
              Row(mainAxisAlignment: MainAxisAlignment.end, children: [
                TextButton(
                    onPressed: () => Navigator.of(context).pop(false),
                    child: const Text('Cancel')),
                const SizedBox(width: 8),
                ElevatedButton(
                    onPressed: () => Navigator.of(context).pop(true),
                    child: const Text('Save'))
              ])
            ]),
          ),
        );
      },
    );

    if (result == true) {
      setState(() {
        final idx = _attendanceRecords.indexWhere((r) =>
            identical(r, rec) ||
            (r.employeeName == rec.employeeName &&
                r.dateYmd == rec.dateYmd &&
                r.clockIn == rec.clockIn &&
                r.clockOut == rec.clockOut));
        if (idx >= 0) {
          final newDuration = '${clockInCtrl.text} - ${clockOutCtrl.text}';
          _attendanceRecords[idx] = AttendanceRecord(
            employeeName: rec.employeeName,
            dateYmd: dateCtrl.text.trim(),
            clockIn: clockInCtrl.text.trim(),
            clockOut: clockOutCtrl.text.trim(),
            duration: newDuration,
          );
        }
      });
      EmployeeUtils.toast(context, 'Attendance updated');
      await _saveAttendance();
    }
  }

  Future<void> _onDeleteAttendance(AttendanceRecord rec) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete attendance record?'),
        content: Text(
            'Delete the attendance record for ${rec.employeeName} on ${rec.dateYmd}?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel')),
          TextButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Delete', style: TextStyle(color: Colors.red))),
        ],
      ),
    );

    if (confirm == true) {
      setState(() => _attendanceRecords.removeWhere((r) =>
          (r.employeeName == rec.employeeName &&
              r.dateYmd == rec.dateYmd &&
              r.clockIn == rec.clockIn &&
              r.clockOut == rec.clockOut)));
      EmployeeUtils.toast(context, 'Attendance deleted');
      await _saveAttendance();
    }
  }

  // Return attendance records filtered by employee and date range
  List<AttendanceRecord> _getFilteredAttendanceRecords() {
    final empFilter = _attendanceEmployeeFilter;
    final range = _attendanceDateRange;
    final anchor = _recordsDate;

    DateTime? parseDate(String ymd) {
      try {
        return DateTime.parse(ymd);
      } catch (_) {
        return null;
      }
    }

    DateTime startOfWeek(DateTime d) =>
        d.subtract(Duration(days: d.weekday - 1));
    DateTime endOfWeek(DateTime d) =>
        startOfWeek(d).add(const Duration(days: 6));

    return _attendanceRecords.where((r) {
      if (empFilter != 'All Employees' && r.employeeName != empFilter) {
        return false;
      }
      final recDate = parseDate(r.dateYmd);
      if (recDate == null) return false;

      if (range == 'Today') {
        final a = DateTime(anchor.year, anchor.month, anchor.day);
        final b = DateTime(recDate.year, recDate.month, recDate.day);
        return a == b;
      } else if (range == 'This Week') {
        final start = DateTime(startOfWeek(anchor).year,
            startOfWeek(anchor).month, startOfWeek(anchor).day);
        final end = DateTime(endOfWeek(anchor).year, endOfWeek(anchor).month,
            endOfWeek(anchor).day);
        final d = DateTime(recDate.year, recDate.month, recDate.day);
        return !d.isBefore(start) && !d.isAfter(end);
      } else if (range == 'This Month') {
        return recDate.year == anchor.year && recDate.month == anchor.month;
      }
      return true;
    }).toList();
  }

  Future<void> _loadInitialData() async {
    final prefs = await SharedPreferences.getInstance();
    final empStr = prefs.getString('owner_employees_v1');
    final attStr = prefs.getString('owner_attendance_v1');
    debugPrint(
        '[employees] _loadInitialData empStr=${empStr == null ? '<null>' : '${empStr.length} chars'} attStr=${attStr == null ? '<null>' : '${attStr.length} chars'}');

    if (empStr != null) {
      try {
        final List<dynamic> arr = jsonDecode(empStr);
        _employees = arr
            .map((e) => Employee.fromJson(e as Map<String, dynamic>))
            .toList();
        debugPrint('[employees] loaded ${_employees.length} employees');
      } catch (err, st) {
        debugPrint('[employees] load error: $err\n$st');
        _employees = List.of(mockEmployees());
      }
    } else {
      _employees = List.of(mockEmployees());
      await prefs.setString('owner_employees_v1',
          jsonEncode(_employees.map((e) => e.toJson()).toList()));
      debugPrint('[employees] seeded default employees');
    }

    if (attStr != null) {
      try {
        final List<dynamic> arr = jsonDecode(attStr);
        _attendanceRecords = arr
            .map((e) => AttendanceRecord.fromJson(e as Map<String, dynamic>))
            .toList();
        debugPrint(
            '[employees] loaded ${_attendanceRecords.length} attendance records');
      } catch (err, st) {
        debugPrint('[employees] attendance load error: $err\n$st');
        _attendanceRecords = List.of(mockAttendanceRecords());
      }
    } else {
      _attendanceRecords = List.of(mockAttendanceRecords());
      await prefs.setString('owner_attendance_v1',
          jsonEncode(_attendanceRecords.map((a) => a.toJson()).toList()));
      debugPrint('[employees] seeded default attendance');
    }

    _seedPermissions(_employees);
    setState(() {});
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

  Future<void> _saveEmployees() async {
    final prefs = await SharedPreferences.getInstance();
    final s = jsonEncode(_employees.map((e) => e.toJson()).toList());
    await prefs.setString('owner_employees_v1', s);
    debugPrint(
        '[employees] saved ${_employees.length} employees (${s.length} chars)');
  }

  Future<void> _saveAttendance() async {
    final prefs = await SharedPreferences.getInstance();
    final s = jsonEncode(_attendanceRecords.map((a) => a.toJson()).toList());
    await prefs.setString('owner_attendance_v1', s);
    debugPrint(
        '[employees] saved ${_attendanceRecords.length} attendance records (${s.length} chars)');
  }

  Future<void> _onAddEmployee() async {
    final result = await showDialog<AddEmployeeFormData>(
      context: context,
      barrierDismissible: false,
      builder: (context) => const AddEmployeeDialog(),
    );

    if (result != null) {
      final newEmp = Employee(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        name: result.employeeName,
        phone: result.phone,
        role: result.role,
        salaryText: '${result.salary} ETB',
        active: true,
      );

      setState(() {
        _employees.insert(0, newEmp);
        _seedPermissions([newEmp]);
      });
      EmployeeUtils.toast(context, 'Employee Added');
      await _saveEmployees();
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

  // Add a manual attendance record, persist it, and refresh the UI
  Future<void> _addManualAttendance() async {
    if (_manualEmployee == 'Select Employee') {
      EmployeeUtils.toast(context, 'Please select an employee');
      return;
    }
    if (_manualClockIn == null || _manualClockOut == null) {
      EmployeeUtils.toast(context, 'Please set clock in and clock out times');
      return;
    }

    final rec = AttendanceRecord(
      employeeName: _manualEmployee,
      dateYmd: EmployeeUtils.formatYmd(_manualDate),
      clockIn: EmployeeUtils.formatTime(_manualClockIn!),
      clockOut: EmployeeUtils.formatTime(_manualClockOut!),
      duration:
          '${EmployeeUtils.formatTime(_manualClockIn!)} - ${EmployeeUtils.formatTime(_manualClockOut!)}',
    );

    setState(() => _attendanceRecords.insert(0, rec));
    debugPrint(
        '[employees] added attendance for ${rec.employeeName} on ${rec.dateYmd}');
    await _saveAttendance();
    EmployeeUtils.toast(context, 'Attendance Saved');
  }

  List<Employee> _getFilteredEmployees() {
    var list = List<Employee>.from(_employees);

    if (widget.allowedRoles != null && widget.allowedRoles!.isNotEmpty) {
      list = list.where((e) => widget.allowedRoles!.contains(e.role)).toList();
    }

    if (widget.hideOtherManagers && widget.currentUserId != null) {
      list = list
          .where((e) => !(e.role == 'Manager' && e.id != widget.currentUserId))
          .toList();
    }

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
    return BlocProvider(
      create: (context) => EmployeeBloc()..add(FetchEmployeeDataEvent()),
      child: Scaffold(
        backgroundColor: Colors.white,
        body: BlocConsumer<EmployeeBloc, EmployeeState>(
          listener: (context, state) {
            if (state is FetchEmployeeSuccessState) {
              setState(() {
                _employees = state.employees;
                _seedPermissions(_employees);
              });
            } else if (state is FailureEmployeeState) {
              setState(() {
                _employees = [];
              });
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Row(
                    children: [
                      const Icon(Icons.error_outline, color: Colors.white),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(state.message ?? ""),
                      ),
                    ],
                  ),
                  backgroundColor: Colors.red.shade700,
                  behavior: SnackBarBehavior.floating,
                  action: SnackBarAction(
                    label: 'RETRY',
                    textColor: Colors.white,
                    onPressed: () {
                      context
                          .read<EmployeeBloc>()
                          .add(FetchEmployeeDataEvent());
                    },
                  ),
                ),
              );
            }
          },
          builder: (context, state) {
            if (state is LoadingEmployeeState) {
              return EmployeeManagementShimmer();
            }

            final displayList = _getFilteredEmployees();
            final roleOptions = [
              'All Roles',
              ..._employees.map((e) => e.role).toSet()
            ];
            final employeeNames = [
              'All Employees',
              ..._employees.map((e) => e.name)
            ];
            final employeeNamesManual = _employees.map((e) => e.name).toList();

            return SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TopTabs(
                      index: _tabIndex,
                      onChanged: (i) => setState(() => _tabIndex = i)),
                  const SizedBox(height: 12),
                  if (_tabIndex == 0) ...[
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

                    if (displayList.isEmpty)
                      Center(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 40.0),
                          child: Column(
                            children: [
                              Icon(Icons.people_outline,
                                  size: 48, color: Colors.grey[400]),
                              const SizedBox(height: 10),
                              Text(
                                "No employees found",
                                style: TextStyle(color: Colors.grey[600]),
                              ),
                            ],
                          ),
                        ),
                      )
                    else
                      EmployeesTable(
                        items: displayList,
                        totalCount: displayList.length,
                        onEdit: _onEditEmployee,
                        onDelete: _onDeleteEmployee,
                      ),

                    const SizedBox(height: 14),

                    if (displayList.isNotEmpty)
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
                    SectionHeader(
                      title: 'Attendance',
                      subtitle: 'Track and manage employee attendance',
                      rightActions: Row(mainAxisSize: MainAxisSize.min, children: [
                        OutlinedButton.icon(
                            onPressed: () =>
                                EmployeeUtils.toast(context, 'CSV'),
                            icon: const Icon(Icons.download, size: 16),
                            label: const Text("Export CSV")),
                        const SizedBox(width: 10),
                        OutlinedButton.icon(
                            onPressed: () =>
                                EmployeeUtils.toast(context, 'PDF'),
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
                      dateRangeItems: const [
                        'Today',
                        'This Week',
                        'This Month'
                      ],
                      onDateRangeChanged: (v) =>
                          setState(() => _attendanceDateRange = v),
                    ),
                    const SizedBox(height: 14),
                    AddAttendanceManuallyCard(
                      employees: employeeNamesManual,
                      selectedEmployee: _manualEmployee,
                      onEmployeeChanged: (v) =>
                          setState(() => _manualEmployee = v),
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
                      onSave: _addManualAttendance,
                    ),
                    const SizedBox(height: 14),
                    AttendanceRecordsCard(
                      recordsDate: _recordsDate,
                      onPrevDate: () => setState(() => _recordsDate =
                          _recordsDate.subtract(const Duration(days: 1))),
                      onNextDate: () => setState(() =>
                          _recordsDate = _recordsDate.add(const Duration(days: 1))),
                      records: _getFilteredAttendanceRecords(),
                      onEditRecord: _onEditAttendance,
                      onDeleteRecord: _onDeleteAttendance,
                    ),
                  ],
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}