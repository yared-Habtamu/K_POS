import 'dart:convert'; // Required for jsonDecode
import 'dart:io'; // Required for SocketException
import 'dart:async'; // Required for TimeoutException

import 'package:http/http.dart' as http;
import 'package:pos_app/core/error/exceptions.dart';
import 'package:pos_app/features/common_use_pages/employee_managment/domain/employee_model.dart';
import 'package:pos_app/services/app_constants.dart';

import 'package:pos_app/services/api/api_config.dart';
import 'package:pos_app/services/api/auth_storage.dart';

class EmployeeRemoteDataSource {
  static final String baseUrl = AppConstants.baseUrl;

  /// Fetch employees from backend (/api/employees)
  static Future<List<Employee>> fetchEmployees({
    required List<AllowedEmployeeRole> allowedRolesToFetch,
  }) async {
    try {
      final auth = AuthStorage();
      final token = await auth.readToken();
      final url = ApiConfig.apiUrl('/employees');

      final response = await http.get(Uri.parse(url), headers: {
        if (token != null) 'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      }).timeout(const Duration(seconds: 10));

      return _processResponse(response);
    } on SocketException {
      throw NoInternetException(
          'No Internet connection. Please check your settings.');
    } on TimeoutException {
      throw FetchDataException('Connection timed out. Please try again.');
    } on FormatException {
      throw FetchDataException('Bad response format from server.');
    } catch (e) {
      if (e is AppException) rethrow;
      throw AppException('Unexpected error occurred.');
    }
  }

  // Create employee
  static Future<Employee> createEmployee({
    required String name,
    String? username,
    required String password,
    required String role,
    required String phone,
    required String salary,
  }) async {
    try {
      final auth = AuthStorage();
      final token = await auth.readToken();
      final url = ApiConfig.apiUrl('/employees');

      // map UI role labels to server roles
      final serverRole = () {
        final s = role.toLowerCase();
        if (s.contains('manager')) return 'manager';
        if (s.contains('cashier')) return 'cashier';
        if (s.contains('store') && s.contains('keeper')) return 'storeKeeper';
        return role;
      }();

      final response = await http
          .post(Uri.parse(url),
              headers: {
                if (token != null) 'Authorization': 'Bearer $token',
                'Content-Type': 'application/json'
              },
              body: jsonEncode({
                'name': name,
                'username': username,
                'password': password,
                'role': serverRole,
                'phone': phone,
                'salary': salary
              }))
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 201) {
        final Map<String, dynamic> body = jsonDecode(response.body);
        final u = body['user'] as Map<String, dynamic>;
        return Employee.fromJson(u);
      }

      // Delegate to common error handler
      _processResponse(response);
      throw AppException('Unexpected response');
    } on SocketException {
      throw NoInternetException(
          'No Internet connection. Please check your settings.');
    } on TimeoutException {
      throw FetchDataException('Connection timed out. Please try again.');
    } catch (e) {
      if (e is AppException) rethrow;
      throw AppException('Failed to create employee');
    }
  }

  // Create attendance record
  static Future<bool> createAttendance({
    required String employeeId,
    required String employeeName,
    required String dateYmd,
    required String clockIn,
    String? clockOut,
  }) async {
    try {
      final auth = AuthStorage();
      final token = await auth.readToken();
      final url = ApiConfig.apiUrl('/attendance');

      final body = <String, dynamic>{
        'employeeName': employeeName,
        'dateYmd': dateYmd,
        'clockIn': clockIn,
      };
      if (clockOut != null) body['clockOut'] = clockOut;
      if (employeeId.isNotEmpty) body['employeeId'] = employeeId;

      final response = await http
          .post(Uri.parse(url),
              headers: {
                if (token != null) 'Authorization': 'Bearer $token',
                'Content-Type': 'application/json'
              },
              body: jsonEncode(body))
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 201) return true;

      _processResponse(response);
      throw AppException('Unexpected response');
    } on SocketException {
      throw NoInternetException(
          'No Internet connection. Please check your settings.');
    } on TimeoutException {
      throw FetchDataException('Connection timed out. Please try again.');
    } catch (e) {
      if (e is AppException) rethrow;
      throw AppException('Failed to create attendance');
    }
  }

  // --- Helper to process status codes ---
  static List<Employee> _processResponse(http.Response response) {
    switch (response.statusCode) {
      case 200:
        final List<dynamic> body = jsonDecode(response.body);
        return body.map((e) => Employee.fromJson(e)).toList();
      case 400:
        throw BadRequestException(
            jsonDecode(response.body)['message'] ?? "Invalid Request");
      case 401:
      case 403:
        throw UnauthorisedException(
            jsonDecode(response.body)['message'] ?? "Access Denied");
      case 404:
        throw FetchDataException("Employee data not found.");
      case 409:
        // Resource conflict (e.g., username already exists)
        throw BadRequestException(
            jsonDecode(response.body)['message'] ?? "Conflict");
      case 500:
      default:
        throw FetchDataException(
            'Error occurred while communicating with server. StatusCode: ${response.statusCode}');
    }
  }

  // Fetch attendance
  static Future<List<AttendanceRecord>> fetchAttendance({
    String? dateYmd,
    String? employeeId,
  }) async {
    try {
      final auth = AuthStorage();
      final token = await auth.readToken();
      var url = ApiConfig.apiUrl('/attendance');
      final query = <String, String>{};
      if (dateYmd != null) query['dateYmd'] = dateYmd;
      if (employeeId != null) query['employeeId'] = employeeId;
      if (query.isNotEmpty) {
        final qs = query.entries
            .map((e) => '${e.key}=${Uri.encodeComponent(e.value)}')
            .join('&');
        url = '$url?$qs';
      }

      final response = await http.get(Uri.parse(url), headers: {
        if (token != null) 'Authorization': 'Bearer $token',
        'Content-Type': 'application/json'
      }).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        try {
          final decoded = jsonDecode(response.body);
          if (decoded is! List) {
            throw const FormatException('Expected a JSON array');
          }
          return decoded
              .map((e) =>
                  AttendanceRecord.fromJson((e as Map).cast<String, dynamic>()))
              .toList(growable: false);
        } on FormatException catch (_) {
          final prefix = response.body.length > 120
              ? response.body.substring(0, 120)
              : response.body;
          throw AppException(
              'Attendance response is not valid JSON. Check API base URL. Got: ${prefix.trim()}');
        } on TypeError catch (e) {
          throw AppException('Failed to parse attendance data: $e');
        }
      }

      _processResponse(response);
      throw AppException('Unexpected response');
    } on SocketException {
      throw NoInternetException(
          'No Internet connection. Please check your settings.');
    } on TimeoutException {
      throw FetchDataException('Connection timed out. Please try again.');
    } catch (e) {
      if (e is AppException) rethrow;
      throw AppException('Failed to fetch attendance');
    }
  }

  // Update attendance
  static Future<bool> updateAttendance({
    required String id,
    String? employeeId,
    String? employeeName,
    String? clockIn,
    String? clockOut,
    String? notes,
  }) async {
    try {
      final auth = AuthStorage();
      final token = await auth.readToken();
      final url = ApiConfig.apiUrl('/attendance/$id');

      final body = <String, dynamic>{};
      if (employeeId != null) body['employeeId'] = employeeId;
      if (employeeName != null) body['employeeName'] = employeeName;
      if (clockIn != null) body['clockIn'] = clockIn;
      if (clockOut != null) body['clockOut'] = clockOut;
      if (notes != null) body['notes'] = notes;

      final response = await http
          .put(Uri.parse(url),
              headers: {
                if (token != null) 'Authorization': 'Bearer $token',
                'Content-Type': 'application/json'
              },
              body: jsonEncode(body))
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) return true;
      _processResponse(response);
      throw AppException('Unexpected response');
    } on SocketException {
      throw NoInternetException(
          'No Internet connection. Please check your settings.');
    } on TimeoutException {
      throw FetchDataException('Connection timed out. Please try again.');
    } catch (e) {
      if (e is AppException) rethrow;
      throw AppException('Failed to update attendance');
    }
  }

  // Delete attendance
  static Future<bool> deleteAttendance(String id) async {
    try {
      final auth = AuthStorage();
      final token = await auth.readToken();
      final url = ApiConfig.apiUrl('/attendance/$id');
      final response = await http.delete(Uri.parse(url), headers: {
        if (token != null) 'Authorization': 'Bearer $token',
        'Content-Type': 'application/json'
      }).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) return true;
      _processResponse(response);
      throw AppException('Unexpected response');
    } on SocketException {
      throw NoInternetException(
          'No Internet connection. Please check your settings.');
    } on TimeoutException {
      throw FetchDataException('Connection timed out. Please try again.');
    } catch (e) {
      if (e is AppException) rethrow;
      throw AppException('Failed to delete attendance');
    }
  }

  // Delete employee
  static Future<bool> deleteEmployee(String id) async {
    try {
      final auth = AuthStorage();
      final token = await auth.readToken();
      final url = ApiConfig.apiUrl('/employees/$id');
      final response = await http.delete(Uri.parse(url), headers: {
        if (token != null) 'Authorization': 'Bearer $token',
        'Content-Type': 'application/json'
      }).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) return true;
      _processResponse(response);
      throw AppException('Unexpected response');
    } on SocketException {
      throw NoInternetException(
          'No Internet connection. Please check your settings.');
    } on TimeoutException {
      throw FetchDataException('Connection timed out. Please try again.');
    } catch (e) {
      if (e is AppException) rethrow;
      throw AppException('Failed to delete employee');
    }
  }

  // Update employee
  static Future<Employee> updateEmployee({
    required String id,
    String? name,
    String? phone,
    String? role,
    String? salary,
  }) async {
    try {
      final auth = AuthStorage();
      final token = await auth.readToken();
      final url = ApiConfig.apiUrl('/employees/$id');
      final body = <String, dynamic>{};
      if (name != null) body['name'] = name;
      if (phone != null) body['phone'] = phone;
      if (role != null) body['role'] = role;
      if (salary != null) body['salary'] = salary;

      final response = await http
          .put(Uri.parse(url),
              headers: {
                if (token != null) 'Authorization': 'Bearer $token',
                'Content-Type': 'application/json'
              },
              body: jsonEncode(body))
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final Map<String, dynamic> body = jsonDecode(response.body);
        return Employee.fromJson(body);
      }

      _processResponse(response);
      throw AppException('Unexpected response');
    } on SocketException {
      throw NoInternetException(
          'No Internet connection. Please check your settings.');
    } on TimeoutException {
      throw FetchDataException('Connection timed out. Please try again.');
    } catch (e) {
      if (e is AppException) rethrow;
      throw AppException('Failed to update employee');
    }
  }

  // Update data
  static Future<bool> updateEmployeesData() async {
    try {
      return true;
    } catch (e) {
      throw AppException("Failed to update employee data");
    }
  }

  // Update user permissions (PUT /api/auth/users/:id)
  static Future<Employee> updateUserPermissions({
    required String id,
    required List<String> permissions,
  }) async {
    try {
      final auth = AuthStorage();
      final token = await auth.readToken();
      final url = ApiConfig.apiUrl('/auth/users/$id');

      final response = await http
          .put(Uri.parse(url),
              headers: {
                if (token != null) 'Authorization': 'Bearer $token',
                'Content-Type': 'application/json'
              },
              body: jsonEncode({'permissions': permissions}))
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final Map<String, dynamic> body = jsonDecode(response.body);
        return Employee.fromJson(body);
      }

      _processResponse(response);
      throw AppException('Unexpected response');
    } on SocketException {
      throw NoInternetException(
          'No Internet connection. Please check your settings.');
    } on TimeoutException {
      throw FetchDataException('Connection timed out. Please try again.');
    } catch (e) {
      if (e is AppException) rethrow;
      throw AppException('Failed to update user permissions');
    }
  }
}
