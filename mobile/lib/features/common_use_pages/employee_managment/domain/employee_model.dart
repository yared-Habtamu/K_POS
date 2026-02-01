class Employee {
  final String id;
  final String name;
  final String phone;
  final String role;
  final String salaryText;
  final bool active;

  const Employee({
    required this.id,
    required this.name,
    required this.phone,
    required this.role,
    required this.salaryText,
    required this.active,
  });

  factory Employee.fromJson(Map<String, dynamic> json) {
    return Employee(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      phone: json['phone'] ?? '',
      role: json['role'] ?? '',
      salaryText: json['salaryText'] ?? '',
      active: json['active'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'phone': phone,
      'role': role,
      'salaryText': salaryText,
      'active': active,
    };
  }
}

class AttendanceRecord {
  final String employeeName;
  final String dateYmd;
  final String clockIn;
  final String clockOut;
  final String duration;

  const AttendanceRecord({
    required this.employeeName,
    required this.dateYmd,
    required this.clockIn,
    required this.clockOut,
    required this.duration,
  });
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

enum AllowedEmployeeRole{
  storeKeeper,
  manager,
  cashier,
  owner,
  systemAdmin,
}

// --- Mock Data Generators (Move to a Repository later) ---

List<Employee> mockEmployees() {
  return const [
    Employee(id: 'e1', name: 'Yared Abebe', phone: '+251936092577', role: 'Owner', salaryText: '0 ETB', active: true),
    Employee(id: 'e2', name: 'kebede', phone: '+251936092578', role: 'Cashier', salaryText: '3,000 ETB', active: true),
    Employee(id: 'e4', name: 'kiya', phone: '+251936092575', role: 'Cashier', salaryText: '2,000 ETB', active: true),
    Employee(id: 'e5', name: 'chala', phone: '0949986167', role: 'Store Keeper', salaryText: '10,000 ETB', active: true),
    Employee(id: 'e6', name: 'kaleb', phone: '0949986169', role: 'Cashier', salaryText: '10,000 ETB', active: true),
    Employee(id: 'e8', name: 'Sami', phone: '0911111111', role: 'Manager', salaryText: '8,000 ETB', active: true),
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