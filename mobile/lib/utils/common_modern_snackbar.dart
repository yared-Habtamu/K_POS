import 'package:flutter/material.dart';
import 'package:get/get.dart';

class AppSnackbar {
  AppSnackbar._(); // prevents creating instance

  static void success(String message, {String title = "Success"}) {
    _showSnackbar(
      title: title,
      message: message,
      backgroundColor: Colors.green.shade600,
      icon: Icons.check_circle_rounded,
    );
  }

  static void error(String message, {String title = "Error"}) {
    _showSnackbar(
      title: title,
      message: message,
      backgroundColor: Colors.red.shade600,
      icon: Icons.error_rounded,
    );
  }

  static void warning(String message, {String title = "Warning"}) {
    _showSnackbar(
      title: title,
      message: message,
      backgroundColor: Colors.orange.shade700,
      icon: Icons.warning_rounded,
    );
  }

  static void info(String message, {String title = "Info"}) {
    _showSnackbar(
      title: title,
      message: message,
      backgroundColor: Colors.blue.shade600,
      icon: Icons.info_rounded,
    );
  }

  static void _showSnackbar({
    required String title,
    required String message,
    required Color backgroundColor,
    required IconData icon,
  }) {
    Get.closeAllSnackbars();

    Get.snackbar(
      title,
      message,
      snackPosition: SnackPosition.TOP,
      margin: const EdgeInsets.all(12),
      borderRadius: 14,
      backgroundColor: backgroundColor,
      colorText: Colors.white,
      icon: Icon(icon, color: Colors.white),
      shouldIconPulse: false,
      duration: const Duration(seconds: 3),

      // animation feel
      animationDuration: const Duration(milliseconds: 300),

      // floating effect
      snackStyle: SnackStyle.FLOATING,

      // slight blur feel
      barBlur: 10,

      // progress indicator
      showProgressIndicator: true,
      progressIndicatorBackgroundColor: Colors.white24,
      progressIndicatorValueColor:
          const AlwaysStoppedAnimation<Color>(Colors.white),

      boxShadows: [
        BoxShadow(
          color: Colors.black26,
          blurRadius: 12,
          offset: Offset(0, 6),
        )
      ],
    );
  }
}
