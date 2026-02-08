import 'package:flutter/foundation.dart';

class PermissionNotifier extends ChangeNotifier {
  PermissionNotifier._private();
  static final PermissionNotifier instance = PermissionNotifier._private();

  String? _message;

  void notify(String message) {
    // Avoid notifying the same message repeatedly
    if (_message == message) return;
    _message = message;
    notifyListeners();
  }

  String? consume() {
    final m = _message;
    _message = null;
    return m;
  }
}
