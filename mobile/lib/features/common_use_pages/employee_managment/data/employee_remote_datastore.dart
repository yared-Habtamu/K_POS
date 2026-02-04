import 'dart:convert'; // Required for jsonDecode
import 'dart:io'; // Required for SocketException
import 'dart:async'; // Required for TimeoutException

import 'package:get/get_connect/http/src/response/response.dart';
import 'package:http/http.dart' as http;
import 'package:pos_app/core/error/exceptions.dart';
import 'package:pos_app/features/common_use_pages/employee_managment/domain/employee_model.dart';
import 'package:pos_app/services/app_constants.dart';

class EmployeeRemoteDataSource {
  static final String baseUrl = AppConstants.baseUrl;

  /// Fetch employees with error handling
  static Future<List<Employee>> fetchEmployees({
    required List<AllowedEmployeeRole> allowedRolesToFetch,
  }) async {
    try {
      // 1. Add Timeout to prevent hanging
      final response = await http.get(
        Uri.parse('$baseUrl/fetchEmployee'),
        headers: {
          "allowedRoles": allowedRolesToFetch.toString(),
          "Content-Type": "application/json",
        },
      ).timeout(const Duration(seconds: 10));

      // 2. Handle HTTP Status Codes
      return _processResponse(response);
    } on SocketException {
      // 3. specific error for no internet
      throw NoInternetException(
          'No Internet connection. Please check your settings.');
    } on TimeoutException {
      // 4. Specific error for slow connection
      throw FetchDataException('Connection timed out. Please try again.');
    } on FormatException {
      // 5. Error if backend returns HTML instead of JSON (common server error)
      throw FetchDataException('Bad response format from server.');
    } catch (e) {
      // 6. Fallback for any other logic error
      if (e is AppException) rethrow; // If it's already processed, pass it up
      throw AppException('Unexpected error occurred.');
    }
  }

  // --- Helper to process status codes ---
  static List<Employee> _processResponse(http.Response response) {
    switch (response.statusCode) {
      case 200:
        // Parse the body (result.body, not result.data)
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
      case 500:
      default:
        throw FetchDataException(
            'Error occurred while communicating with server. StatusCode: ${response.statusCode}');
    }
  }

  // Update permissions
  static Future<bool> updateEmployeesPermissions() async {
    try {
      // Implementation here...
      return true;
    } catch (e) {
      // Wrap generic errors
      throw AppException("Failed to update permissions");
    }
  }

  // Update data
  static Future<bool> updateEmployeesData() async {
    try {
      // Implementation here...
      return true;
    } catch (e) {
      throw AppException("Failed to update employee data");
    }
  }
}
