import 'package:flutter/material.dart';
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
    _attendanceRecords = List.of(mockAttendanceRecords());
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
      // In real app, call Bloc add event here.
      // For now we simulate local add.
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
      if (mounted) EmployeeUtils.toast(context, 'Employee Added');
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
            }
            // HERE IS THE FIX:
            else if (state is FailureEmployeeState) {
              // 1. Clear the list so the page shows empty state
              setState(() {
                _employees = [];
              });

              // 2. Show the User Friendly SnackBar
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Row(
                    children: [
                      const Icon(Icons.error_outline, color: Colors.white),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(state.message ?? ""),
                      ), // Friendly message
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
            // Keep loading separate to avoid user interacting while fetching
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

                    // Display Empty State if list is empty (Due to error or no data)
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
                      ),

                    const SizedBox(height: 14),

                    // Hide permissions section if no employees
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
                    // --- Attendance Tab (Same as before) ---
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
                      onSave: () =>
                          EmployeeUtils.toast(context, 'Attendance Saved'),
                    ),
                    const SizedBox(height: 14),

                    AttendanceRecordsCard(
                      recordsDate: _recordsDate,
                      onPrevDate: () => setState(() => _recordsDate =
                          _recordsDate.subtract(const Duration(days: 1))),
                      onNextDate: () => setState(() => _recordsDate =
                          _recordsDate.add(const Duration(days: 1))),
                      records: _attendanceRecords,
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
