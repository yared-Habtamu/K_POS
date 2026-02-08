import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:pos_app/features/common_use_pages/employee_managment/presentation/widgets/attendance_components.dart';
import 'package:pos_app/features/common_use_pages/employee_managment/presentation/bloc/employee_bloc.dart';
import 'package:pos_app/features/common_use_pages/employee_managment/domain/employee_model.dart';
import 'package:pos_app/features/common_use_pages/employee_managment/data/employee_remote_datastore.dart';
import 'package:pos_app/core/error/exceptions.dart';
import 'package:pos_app/services/api/auth_storage.dart';
import '../../employee_utils.dart';
import '../widgets/add_employee_dialog.dart';
import '../widgets/employee_components.dart';
import '../widgets/employee_shimmer_effect.dart';
import 'package:provider/provider.dart';
import 'package:pos_app/services/get_current_user.dart';
import 'package:pos_app/utils/permission_notifier.dart';

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
  final Map<String, bool> _managerApplyDiscount = {};
  final Map<String, bool> _managerAddItemsWithPrice = {};
  final Map<String, bool> _storeTransferStock = {};
  final Map<String, bool> _cashierApplyDiscount = {};
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
    PermissionNotifier.instance.addListener(_onPermissionNotification);
    WidgetsBinding.instance
        .addPostFrameCallback((_) => _onPermissionNotification());
  }

  @override
  void dispose() {
    _searchController.dispose();
    PermissionNotifier.instance.removeListener(_onPermissionNotification);
    super.dispose();
  }

  void _onPermissionNotification() {
    final msg = PermissionNotifier.instance.consume();
    if (msg == null) return;
    if (!mounted) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    });
  }

  // --- Employee edit/delete handlers ---
  Future<void> _onEditEmployee(Employee emp) async {
    final nameCtrl = TextEditingController(text: emp.name);
    final phoneCtrl = TextEditingController(text: emp.phone);
    String role = (() {
      final s = emp.role.trim().toLowerCase();
      if (s.contains('manager')) return 'Manager';
      if (s.contains('cashier')) return 'Cashier';
      if (s.contains('store') && s.contains('keeper')) return 'Store Keeper';
      return emp.role;
    })();

    // Determine allowed role options for editing based on page context
    final allowedRoleOptions =
        widget.allowedRoles ?? const ['Manager', 'Cashier', 'Store Keeper'];
    // Normalize displayed labels
    final allowedItems = allowedRoleOptions.map((r) {
      final s = r.trim().toLowerCase();
      if (s.contains('manager')) return 'Manager';
      if (s.contains('cashier')) return 'Cashier';
      if (s.contains('store') && s.contains('keeper')) return 'Store Keeper';
      return r;
    }).toList();
    if (!allowedItems.contains(role)) role = allowedItems.first;
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
                  items: allowedItems
                      .map((r) => DropdownMenuItem(value: r, child: Text(r)))
                      .toList(),
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
      try {
        final updated = await EmployeeRemoteDataSource.updateEmployee(
          id: emp.id,
          name: nameCtrl.text.trim(),
          phone: phoneCtrl.text.trim(),
          role: role,
          salary: salaryCtrl.text.trim(),
        );
        if (!mounted) return;
        EmployeeUtils.toast(context, 'Employee updated');
        // Update local list optimistically
        final idx = _employees.indexWhere((e) => e.id == updated.id);
        if (idx >= 0) {
          setState(() {
            _employees[idx] = updated;
            _seedPermissions([updated]);
          });
        } else {
          // if not found, refresh from server
          try {
            final fresh = await EmployeeRemoteDataSource.fetchEmployees(
                allowedRolesToFetch: []);
            if (!mounted) return;
            setState(() {
              _employees = fresh;
              _seedPermissions(_employees);
            });
          } catch (e) {
            debugPrint('[employees] failed to refresh after update: $e');
          }
        }
      } on AppException catch (e) {
        if (!mounted) return;
        EmployeeUtils.toast(context, e.message);
      } catch (e) {
        if (!mounted) return;
        EmployeeUtils.toast(context, 'Failed to update employee');
      }
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
      try {
        await EmployeeRemoteDataSource.deleteEmployee(emp.id);
        if (!mounted) return;
        EmployeeUtils.toast(context, 'Employee deleted');
        // Remove from local list and refresh attendance
        setState(() {
          _employees.removeWhere((e) => e.id == emp.id);
        });
        try {
          _attendanceRecords = await EmployeeRemoteDataSource.fetchAttendance();
          _annotateAttendanceRoles();
        } catch (e) {
          debugPrint('[attendance] failed to refresh after delete: $e');
        }
        if (!mounted) return;
        setState(() {});
      } on AppException catch (e) {
        if (!mounted) return;
        EmployeeUtils.toast(context, e.message);
      } catch (e) {
        if (!mounted) return;
        EmployeeUtils.toast(context, 'Failed to delete employee');
      }
    }
  }

  // --- Attendance edit/delete handlers ---
  Future<void> _onEditAttendance(AttendanceRecord rec) async {
    // Disallow editing future attendance on client too
    try {
      final rd = DateTime.parse(rec.dateYmd);
      final today = DateTime.now();
      final rdDate = DateTime(rd.year, rd.month, rd.day);
      final tDate = DateTime(today.year, today.month, today.day);
      if (rdDate.isAfter(tDate)) {
        if (!mounted) return;
        EmployeeUtils.toast(
            context, 'Future attendance records cannot be edited');
        return;
      }
    } catch (e) {
      // ignore parse error, allow edit UI which will be validated by server
    }

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
      final newClockIn = clockInCtrl.text.trim();
      final newClockOut = clockOutCtrl.text.trim();
      final newDate = dateCtrl.text.trim();

      // Validate basic date format before calling server
      if (!RegExp(r"^\d{4}-\d{2}-\d{2}").hasMatch(newDate)) {
        if (!mounted) return;
        EmployeeUtils.toast(context, 'Invalid date format. Use YYYY-MM-DD');
        return;
      }

      try {
        if (rec.id != null && rec.id!.isNotEmpty) {
          await EmployeeRemoteDataSource.updateAttendance(
              id: rec.id!,
              clockIn: newClockIn,
              clockOut: newClockOut,
              notes: null);
        } else {
          // create new if no id
          await EmployeeRemoteDataSource.createAttendance(
              employeeId: '',
              employeeName: rec.employeeName,
              dateYmd: newDate,
              clockIn: newClockIn,
              clockOut: newClockOut);
        }
        if (!mounted) return;
        EmployeeUtils.toast(context, 'Attendance updated');
        _attendanceRecords = await EmployeeRemoteDataSource.fetchAttendance();
        _annotateAttendanceRoles();
        if (!mounted) return;
        setState(() {});
      } on AppException catch (e) {
        if (!mounted) return;
        EmployeeUtils.toast(context, e.message);
      } catch (e) {
        if (!mounted) return;
        EmployeeUtils.toast(context, 'Failed to update attendance');
      }
    }
  }

  Future<void> _onDeleteAttendance(AttendanceRecord rec) async {
    // Disallow deleting future attendance on client side
    try {
      final rd = DateTime.parse(rec.dateYmd);
      final today = DateTime.now();
      final rdDate = DateTime(rd.year, rd.month, rd.day);
      final tDate = DateTime(today.year, today.month, today.day);
      if (rdDate.isAfter(tDate)) {
        if (!mounted) return;
        EmployeeUtils.toast(
            context, 'Future attendance records cannot be deleted');
        return;
      }
    } catch (e) {
      // ignore parse error
    }

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
      try {
        if (rec.id != null && rec.id!.isNotEmpty) {
          await EmployeeRemoteDataSource.deleteAttendance(rec.id!);
          _attendanceRecords = await EmployeeRemoteDataSource.fetchAttendance();
        } else {
          _attendanceRecords.removeWhere((r) =>
              (r.employeeName == rec.employeeName &&
                  r.dateYmd == rec.dateYmd &&
                  r.clockIn == rec.clockIn &&
                  r.clockOut == rec.clockOut));
        }
        if (!mounted) return;
        EmployeeUtils.toast(context, 'Attendance deleted');
        setState(() {});
      } on AppException catch (e) {
        if (!mounted) return;
        EmployeeUtils.toast(context, e.message);
      } catch (e) {
        if (!mounted) return;
        EmployeeUtils.toast(context, 'Failed to delete attendance');
      }
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

    // If this page was constructed for managers (allowedRoles provided and does NOT include 'Manager')
    final isManagerPage = widget.allowedRoles != null &&
        widget.allowedRoles!.isNotEmpty &&
        !widget.allowedRoles!.map((r) => r.toLowerCase()).contains('manager');

    return _attendanceRecords.where((r) {
      // Exclude manager/owner roles for manager page
      if (isManagerPage) {
        final role = (r.employeeRole ?? '').toLowerCase();
        if (role == 'manager' || role == 'owner') return false;
      }

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

  // Populate AttendanceRecord.employeeRole by looking up _employees list
  void _annotateAttendanceRoles() {
    if (_attendanceRecords.isEmpty || _employees.isEmpty) return;
    final byId = {for (var e in _employees) e.id: e.role};
    final byName = {for (var e in _employees) e.name: e.role};
    _attendanceRecords = _attendanceRecords.map((r) {
      final role = (r.employeeId != null && byId.containsKey(r.employeeId))
          ? byId[r.employeeId]
          : (byName.containsKey(r.employeeName)
              ? byName[r.employeeName]
              : null);
      return AttendanceRecord(
        id: r.id,
        employeeId: r.employeeId,
        employeeName: r.employeeName,
        dateYmd: r.dateYmd,
        clockIn: r.clockIn,
        clockOut: r.clockOut,
        duration: r.duration,
        employeeRole: role,
      );
    }).toList();
  }

  Future<void> _loadInitialData() async {
    // Move away from local mock storage; rely on backend data.
    // Fetch attendance records from the server and let EmployeeBloc
    // take care of fetching employees.
    try {
      _attendanceRecords = await EmployeeRemoteDataSource.fetchAttendance();
      debugPrint(
          '[employees] loaded ${_attendanceRecords.length} attendance records from server');
    } catch (e) {
      debugPrint('[employees] failed to load attendance from server: $e');
      _attendanceRecords = [];
    }

    // If we already have employee list, annotate records with roles
    _annotateAttendanceRoles();

    _seedPermissions(_employees);
    setState(() {});
  }

  void _seedPermissions(List<Employee> list) {
    for (final e in list) {
      final role = e.role.toLowerCase();
      final has = (String k) => e.permissions.contains(k);
      if (role.contains('manager')) {
        _managerApplyDiscount.putIfAbsent(e.id, () => has('discount'));
        _managerAddItemsWithPrice.putIfAbsent(e.id, () => has('addItem'));
      } else if (role.contains('store') && role.contains('keeper')) {
        _storeTransferStock.putIfAbsent(e.id, () => has('transferStock'));
      } else if (role.contains('cashier')) {
        _cashierApplyDiscount.putIfAbsent(e.id, () => has('discount'));
      }
    }
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
      builder: (context) =>
          AddEmployeeDialog(allowedRoles: widget.allowedRoles),
    );

    if (result != null) {
      try {
        final u = await EmployeeRemoteDataSource.createEmployee(
          name: result.employeeName,
          username: result.username.isEmpty ? null : result.username,
          password: result.password,
          role: result.role,
          phone: result.phone,
          salary: result.salary,
        );
        final uname = u.username ?? u.id;
        if (!mounted) return;
        EmployeeUtils.toast(context, 'Employee Added (username: $uname)');
        // Optimistically insert the created employee into local list so it appears immediately
        setState(() {
          _employees.insert(0, u);
          _seedPermissions([u]);
        });
        // Try to refresh server-side list and attendance; if fetch fails, keep optimistic entry
        try {
          final fresh = await EmployeeRemoteDataSource.fetchEmployees(
              allowedRolesToFetch: []);
          if (!mounted) return;
          setState(() {
            _employees = fresh;
            _seedPermissions(_employees);
          });
        } catch (e) {
          // keep optimistic state, but log
          debugPrint('[employees] failed to refresh after add: $e');
        }

        try {
          _attendanceRecords = await EmployeeRemoteDataSource.fetchAttendance();
          _annotateAttendanceRoles();
        } catch (e) {
          debugPrint('[attendance] failed to refresh after add: $e');
        }

        if (!mounted) return;
        setState(() {});
      } on AppException catch (e) {
        // Helpful handling for username conflicts
        final msg = e.message;
        if (msg.toLowerCase().contains('username') &&
            msg.toLowerCase().contains('exists')) {
          if (!mounted) return;
          final dialogCtx = context;
          final choice = await showDialog<String>(
            context: dialogCtx,
            builder: (c) => AlertDialog(
              title: const Text('Username already exists'),
              content: const Text(
                  'The username is already taken. Would you like the system to auto-generate a username for this employee?'),
              actions: [
                TextButton(
                    onPressed: () => Navigator.of(c).pop('pick'),
                    child: const Text('Pick another')),
                ElevatedButton(
                    onPressed: () => Navigator.of(c).pop('auto'),
                    child: const Text('Auto-generate')),
              ],
            ),
          );

          if (choice == 'auto') {
            try {
              final u2 = await EmployeeRemoteDataSource.createEmployee(
                name: result.employeeName,
                username: null,
                password: result.password,
                role: result.role,
                phone: result.phone,
                salary: result.salary,
              );
              final uname2 = u2.username ?? u2.id;
              if (!mounted) return;
              EmployeeUtils.toast(
                  context, 'Employee Added (username: $uname2)');
              // Insert optimistic and try to refresh full list
              setState(() {
                _employees.insert(0, u2);
                _seedPermissions([u2]);
              });

              try {
                final fresh = await EmployeeRemoteDataSource.fetchEmployees(
                    allowedRolesToFetch: []);
                if (!mounted) return;
                setState(() {
                  _employees = fresh;
                  _seedPermissions(_employees);
                });
              } catch (e) {
                debugPrint(
                    '[employees] failed to refresh after auto-gen add: $e');
              }

              try {
                _attendanceRecords =
                    await EmployeeRemoteDataSource.fetchAttendance();
                _annotateAttendanceRoles();
              } catch (e) {
                debugPrint(
                    '[attendance] failed to refresh after auto-gen add: $e');
              }

              if (!mounted) return;
              setState(() {});
            } on AppException catch (e2) {
              if (!mounted) return;
              EmployeeUtils.toast(context, e2.message);
            } catch (e2) {
              if (!mounted) return;
              EmployeeUtils.toast(context, 'Failed to add employee');
            }
          } else {
            if (!mounted) return;
            EmployeeUtils.toast(context, 'Please choose a different username');
          }
        } else {
          if (!mounted) return;
          EmployeeUtils.toast(context, e.message);
        }
      } catch (e) {
        if (!mounted) return;
        EmployeeUtils.toast(context, 'Failed to add employee');
      }
    }
  }

  // -- Date Pickers --
  Future<void> _pickManualDate() async {
    final picked = await showDatePicker(
        context: context,
        initialDate: _manualDate,
        firstDate: DateTime(2020),
        lastDate: DateTime(2035));
    if (picked != null) {
      if (!mounted) return;
      setState(() => _manualDate = picked);
    }
  }

  // Toggle permission for an employee and persist to backend
  Future<void> _togglePermission(
      String employeeId, String key, bool value) async {
    final empIdx = _employees.indexWhere((e) => e.id == employeeId);
    if (empIdx == -1) return;
    final emp = _employees[empIdx];

    // optimistic local update on UI maps
    setState(() {
      switch (key) {
        case 'discount':
          if (emp.role.toLowerCase().contains('manager'))
            _managerApplyDiscount[employeeId] = value;
          if (emp.role.toLowerCase().contains('cashier'))
            _cashierApplyDiscount[employeeId] = value;
          break;
        case 'addItem':
          _managerAddItemsWithPrice[employeeId] = value;
          break;
        case 'transferStock':
          _storeTransferStock[employeeId] = value;
          break;
      }
    });

    try {
      final curPerms = List<String>.from(emp.permissions);
      final idx = curPerms.indexOf(key);
      if (value && idx == -1) curPerms.add(key);
      if (!value && idx != -1) curPerms.removeAt(idx);

      final updated = await EmployeeRemoteDataSource.updateUserPermissions(
          id: employeeId, permissions: curPerms);

      // update local employee entry with updated permissions
      setState(() {
        _employees[empIdx] = updated;
      });

      // If this affects current session user, update UserProvider and storage
      final authStorage = AuthStorage();
      final currentUserJson = await authStorage.readUser();
      if (currentUserJson != null) {
        final curId =
            (currentUserJson['id'] ?? currentUserJson['_id'])?.toString();
        if (curId != null && curId == employeeId) {
          // update local session user
          final userProvider = context.read<UserProvider>();
          final current = userProvider.user;
          if (current != null) {
            final newUser = current.copyWith(permissions: updated.permissions);
            await userProvider.setUser(newUser);
            ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Your permissions were updated')));
          }
        }
      }

      EmployeeUtils.toast(context, 'Permission saved');
      // Optionally show a small snackbar for the current UI
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Permissions updated')));
      });
    } on AppException catch (e) {
      // rollback UI maps
      setState(() {
        switch (key) {
          case 'discount':
            if (emp.role.toLowerCase().contains('manager'))
              _managerApplyDiscount[employeeId] = !value;
            if (emp.role.toLowerCase().contains('cashier'))
              _cashierApplyDiscount[employeeId] = !value;
            break;
          case 'addItem':
            _managerAddItemsWithPrice[employeeId] = !value;
            break;
          case 'transferStock':
            _storeTransferStock[employeeId] = !value;
            break;
        }
      });
      EmployeeUtils.toast(context, e.message);
    } catch (e) {
      // rollback
      setState(() {
        switch (key) {
          case 'discount':
            if (emp.role.toLowerCase().contains('manager'))
              _managerApplyDiscount[employeeId] = !value;
            if (emp.role.toLowerCase().contains('cashier'))
              _cashierApplyDiscount[employeeId] = !value;
            break;
          case 'addItem':
            _managerAddItemsWithPrice[employeeId] = !value;
            break;
          case 'transferStock':
            _storeTransferStock[employeeId] = !value;
            break;
        }
      });
      EmployeeUtils.toast(context, 'Failed to save permission');
    }
  }

  // Time pickers
  Future<void> _pickClockIn() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _manualClockIn ?? const TimeOfDay(hour: 9, minute: 0),
    );
    if (picked != null) {
      if (!mounted) return;
      setState(() => _manualClockIn = picked);
    }
  }

  Future<void> _pickClockOut() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _manualClockOut ?? const TimeOfDay(hour: 17, minute: 0),
    );
    if (picked != null) {
      if (!mounted) return;
      setState(() => _manualClockOut = picked);
    }
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

    final dateYmd = EmployeeUtils.formatYmd(_manualDate);
    final clockIn = EmployeeUtils.formatTime(_manualClockIn!);
    final clockOut = EmployeeUtils.formatTime(_manualClockOut!);

    try {
      // find the selected employee id by name (we expect unique names in a mart)
      final emp = _employees.firstWhere((e) => e.name == _manualEmployee,
          orElse: () => Employee(
              id: '',
              name: '',
              phone: '',
              role: '',
              salaryText: '',
              active: true));
      final empId = emp.id.isEmpty ? '' : emp.id;
      await EmployeeRemoteDataSource.createAttendance(
        employeeId: empId,
        employeeName: _manualEmployee,
        dateYmd: dateYmd,
        clockIn: clockIn,
        clockOut: clockOut,
      );

      if (!mounted) return;
      EmployeeUtils.toast(context, 'Attendance Saved');
      // refresh local attendance list
      _attendanceRecords = await EmployeeRemoteDataSource.fetchAttendance();
      _annotateAttendanceRoles();
      if (!mounted) return;
      setState(() {});
    } on AppException catch (e) {
      if (!mounted) return;
      EmployeeUtils.toast(context, e.message);
    } catch (e) {
      if (!mounted) return;
      EmployeeUtils.toast(context, 'Failed to save attendance');
    }
  }

  List<Employee> _getFilteredEmployees() {
    var list = List<Employee>.from(_employees);

    // Use allowedRoles (when provided) as creator-roles, not as list filter.
    // Filter visibility rules:
    // - If page allows 'Manager' role (owner page), exclude 'Owner' from list
    // - Else if allowedRoles exists but doesn't include 'Manager' (manager page), exclude all 'Manager' roles
    if (widget.allowedRoles != null && widget.allowedRoles!.isNotEmpty) {
      final roles = widget.allowedRoles!.map((r) => r.toLowerCase()).toList();
      if (roles.contains('manager')) {
        // Owner page: hide owner entries from list (owner shouldn't manage other owners)
        list = list.where((e) => e.role.toLowerCase() != 'owner').toList();
      } else {
        // Manager page: hide both owner and manager roles from list
        list = list
            .where((e) =>
                e.role.toLowerCase() != 'manager' &&
                e.role.toLowerCase() != 'owner')
            .toList();
      }
    }

    // If requested, hide other managers but keep current manager entry (legacy behavior)
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
              // Now that we have employees, annotate attendance records with roles
              _annotateAttendanceRoles();
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
              ...displayList.map((e) => e.role).toSet()
            ];
            final employeeNames = [
              'All Employees',
              ...displayList.map((e) => e.name)
            ];
            final employeeNamesManual = displayList.map((e) => e.name).toList();

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
                        storeTransferStock: _storeTransferStock,
                        cashierApplyDiscount: _cashierApplyDiscount,
                        onManagerDiscount: (id, v) =>
                            _togglePermission(id, 'discount', v),
                        onManagerAddItems: (id, v) =>
                            _togglePermission(id, 'addItem', v),
                        onStoreTransferStock: (id, v) =>
                            _togglePermission(id, 'transferStock', v),
                        onCashierDiscount: (id, v) =>
                            _togglePermission(id, 'discount', v),
                      ),
                  ] else ...[
                    SectionHeader(
                      title: 'Attendance',
                      subtitle: 'Track and manage employee attendance',
                      rightActions:
                          Row(mainAxisSize: MainAxisSize.min, children: [
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
                      onNextDate: () => setState(() => _recordsDate =
                          _recordsDate.add(const Duration(days: 1))),
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
