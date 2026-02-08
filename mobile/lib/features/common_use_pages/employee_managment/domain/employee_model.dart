class Employee {
  final String id;
  final String? username;
  final String name;
  final String phone;
  final String role;
  final String salaryText;
  final bool active;

  const Employee({
    required this.id,
    this.username,
    required this.name,
    required this.phone,
    required this.role,
    required this.salaryText,
    required this.active,
  });

  factory Employee.fromJson(Map<String, dynamic> json) => Employee(
        id: (json['id'] ?? json['_id']) as String? ?? '',
        username: json['username'] as String?,
        name: json['name'] as String? ?? '',
        phone: json['phone'] as String? ?? '',
        role: json['role'] as String? ?? '',
        salaryText: (json['salaryText'] ??
                    (json['salary'] != null ? '${json['salary']} ETB' : ''))
                as String? ??
            '',
        active: json.containsKey('active')
            ? (json['active'] is bool
                ? json['active'] as bool
                : (json['active'] == 'true'))
            : true,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        if (username != null) 'username': username,
        'role': role,
        'salaryText': salaryText,
        'active': active,
      };
}

class AttendanceRecord {
  final String? id;
  final String? employeeId;
  final String employeeName;
  final String dateYmd;
  final String clockIn;
  final String clockOut;
  final String duration;
  final String? employeeRole; // optional role determined from employee list

  const AttendanceRecord({
    this.id,
    this.employeeId,
    required this.employeeName,
    required this.dateYmd,
    required this.clockIn,
    required this.clockOut,
    required this.duration,
    this.employeeRole,
  });

  factory AttendanceRecord.fromJson(Map<String, dynamic> j) => AttendanceRecord(
        id: (j['_id'] ?? j['id']) as String?,
        employeeId: () {
          final v = j['employeeId'] ?? j['employee_id'];
          if (v == null) return null;
          if (v is String) return v;
          if (v is Map) {
            final id = v['_id'] ?? v['id'];
            if (id is String) return id;
            if (id != null) return id.toString();
          }
          return v.toString();
        }(),
        employeeName: (j['employeeName'] ?? '').toString(),
        dateYmd: (j['dateYmd'] ?? '').toString(),
        clockIn: (j['clockIn'] ?? '').toString(),
        clockOut: (j['clockOut'] ?? '').toString(),
        duration: () {
          final d = j['duration'];
          if (d is String) return d;
          if (d != null) return d.toString();
          final dm = j['durationMinutes'];
          if (dm == null) return '';
          return '${dm.toString()} min';
        }(),
        employeeRole: j['employeeRole']?.toString(),
      );

  Map<String, dynamic> toJson() => {
        if (id != null) '_id': id,
        if (employeeId != null) 'employeeId': employeeId,
        'employeeName': employeeName,
        'dateYmd': dateYmd,
        'clockIn': clockIn,
        'clockOut': clockOut,
        'duration': duration,
        if (employeeRole != null) 'employeeRole': employeeRole,
      };
}

class AddEmployeeFormData {
  final String username;
  final String employeeName;
  final String phone;
  final String role;
  final String salary;
  final String password;

  const AddEmployeeFormData({
    required this.username,
    required this.employeeName,
    required this.phone,
    required this.role,
    required this.salary,
    required this.password,
  });
}

enum AllowedEmployeeRole {
  storeKeeper,
  manager,
  cashier,
  owner,
  systemAdmin,
}

// --- Mock Data Generators (Move to a Repository later) ---

List<Employee> mockEmployees() {
  return const [
    Employee(
        id: 'e1',
        name: 'Yared Abebe',
        phone: '+251936092577',
        role: 'Owner',
        salaryText: '0 ETB',
        active: true),
    Employee(
        id: 'e2',
        name: 'kebede',
        phone: '+251936092578',
        role: 'Cashier',
        salaryText: '3,000 ETB',
        active: true),
    Employee(
        id: 'e4',
        name: 'kiya',
        phone: '+251936092575',
        role: 'Cashier',
        salaryText: '2,000 ETB',
        active: true),
    Employee(
        id: 'e5',
        name: 'chala',
        phone: '0949986167',
        role: 'Store Keeper',
        salaryText: '10,000 ETB',
        active: true),
    Employee(
        id: 'e6',
        name: 'kaleb',
        phone: '0949986169',
        role: 'Cashier',
        salaryText: '10,000 ETB',
        active: true),
    Employee(
        id: 'e8',
        name: 'Sami',
        phone: '0911111111',
        role: 'Manager',
        salaryText: '8,000 ETB',
        active: true),
  ];
}

List<AttendanceRecord> mockAttendanceRecords() {
  return const [
    AttendanceRecord(
      employeeName: 'Yared Abebe',
      dateYmd: '2026-01-01',
      clockIn: '04:50 AM',
      clockOut: '04:55 AM',
      duration: '5 min',
    ),
  ];
}
