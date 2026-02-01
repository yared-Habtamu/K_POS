// features/core/error/app_exception.dart

class AppException implements Exception {
  final String message;
  final String? prefix;

  AppException([this.message = "Something went wrong", this.prefix]);

  @override
  String toString() {
    return "$message";
  }
}

class FetchDataException extends AppException {
  FetchDataException([String? message])
      : super(message ?? "Error During Communication");
}

class BadRequestException extends AppException {
  BadRequestException([String? message]) : super(message ?? "Invalid Request");
}

class UnauthorisedException extends AppException {
  UnauthorisedException([String? message]) : super(message ?? "Unauthorised");
}

class NoInternetException extends AppException {
  NoInternetException([String? message])
      : super(message ?? "No Internet connection");
}
