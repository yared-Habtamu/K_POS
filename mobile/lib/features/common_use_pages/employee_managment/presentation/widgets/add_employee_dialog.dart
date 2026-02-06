import 'package:flutter/material.dart';

import '../../domain/employee_model.dart';
// Adjust the import path based on your actual folder structure

class AddEmployeeDialog extends StatefulWidget {
  final List<String>? allowedRoles;
  const AddEmployeeDialog({super.key, this.allowedRoles});

  @override
  State<AddEmployeeDialog> createState() => _AddEmployeeDialogState();
}

class _AddEmployeeDialogState extends State<AddEmployeeDialog> {
  final _usernameController = TextEditingController();
  final _employeeNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _salaryController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  String _role = '';

  String _normalizeDisplayRole(String r) {
    final s = r.trim().toLowerCase();
    if (s.contains('manager')) return 'Manager';
    if (s.contains('cashier')) return 'Cashier';
    if (s.contains('store') && s.contains('keeper')) return 'Store Keeper';
    // fallback to title case
    return r.isEmpty ? '' : '${r[0].toUpperCase()}${r.substring(1)}';
  }

  @override
  void initState() {
    super.initState();
    // Set initial role to first allowed role (normalized) to avoid Dropdown mismatch
    final provided =
        widget.allowedRoles ?? const ['Manager', 'Cashier', 'Store Keeper'];
    final first = provided.isNotEmpty ? provided.first : 'Manager';
    _role = _normalizeDisplayRole(first);
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _employeeNameController.dispose();
    _phoneController.dispose();
    _salaryController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _toast(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
    );
  }

  void _save() {
    final username = _usernameController.text.trim();
    final employeeName = _employeeNameController.text.trim();
    final phone = _phoneController.text.trim();
    final salary = _salaryController.text.trim();
    final password = _passwordController.text;
    final confirm = _confirmPasswordController.text;

    // Validation
    if (employeeName.isEmpty) {
      _toast('Employee Name is required');
      return;
    }
    if (phone.isEmpty) {
      _toast('Phone is required');
      return;
    }
    if (salary.isEmpty) {
      _toast('Salary is required');
      return;
    }
    if (password.isEmpty) {
      _toast('Password is required');
      return;
    }
    if (password != confirm) {
      _toast('Passwords do not match');
      return;
    }

    Navigator.of(context).pop(
      AddEmployeeFormData(
        username: username,
        employeeName: employeeName,
        phone: phone,
        role: _role,
        salary: salary,
        password: password,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provided =
        widget.allowedRoles ?? const ['Manager', 'Cashier', 'Store Keeper'];
    final roles = provided.map((r) => _normalizeDisplayRole(r)).toList();

    // --- Helper Widgets matching your UI ---

    Widget labeled(String label, Widget child, {bool required = false}) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            required ? '$label *' : label,
            style: TextStyle(
                fontSize: 13,
                color: Colors.grey.shade900,
                fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          child,
        ],
      );
    }

    Widget input({
      required TextEditingController controller,
      required String hint,
      TextInputType? keyboardType,
      bool obscure = false,
    }) {
      return Container(
        height: 48,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: Center(
          child: TextField(
            controller: controller,
            keyboardType: keyboardType,
            obscureText: obscure,
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: TextStyle(color: Colors.grey.shade500),
              border: InputBorder.none,
              isCollapsed: true,
            ),
          ),
        ),
      );
    }

    Widget dropdown({
      required String value,
      required List<String> items,
      required ValueChanged<String> onChanged,
    }) {
      return Container(
        height: 48,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: DropdownButtonHideUnderline(
          child: DropdownButton<String>(
            isExpanded: true,
            value: value,
            icon: Icon(Icons.keyboard_arrow_down_rounded,
                color: Colors.grey.shade700),
            items: items
                .map(
                  (r) => DropdownMenuItem<String>(
                    value: r,
                    child: Text(
                      r,
                      style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey.shade900,
                          fontWeight: FontWeight.w700),
                    ),
                  ),
                )
                .toList(),
            onChanged: (v) {
              if (v != null) onChanged(v);
            },
          ),
        ),
      );
    }

    // --- Main UI Content ---

    final dialogChild = Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Add Employee',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                ),
              ),
              IconButton(
                onPressed: () => Navigator.of(context).pop(),
                icon: Icon(Icons.close, color: Colors.grey.shade700),
                tooltip: 'Close',
              ),
            ],
          ),
          const SizedBox(height: 14),
          labeled(
            'Username (optional)',
            input(
                controller: _usernameController,
                hint: 'login username (optional)'),
          ),
          const SizedBox(height: 14),
          labeled(
            'Employee Name',
            input(controller: _employeeNameController, hint: ''),
            required: true,
          ),
          const SizedBox(height: 14),
          labeled(
            'Phone',
            input(
                controller: _phoneController,
                hint: '+251...',
                keyboardType: TextInputType.phone),
            required: true,
          ),
          const SizedBox(height: 14),
          labeled(
            'Role',
            dropdown(
              value: _role,
              items: roles,
              onChanged: (v) => setState(() => _role = v),
            ),
            required: true,
          ),
          const SizedBox(height: 14),
          labeled(
            'Salary (ETB)',
            input(
                controller: _salaryController,
                hint: '',
                keyboardType: TextInputType.number),
            required: true,
          ),
          const SizedBox(height: 14),
          labeled(
            'Password',
            input(controller: _passwordController, hint: '', obscure: true),
            required: true,
          ),
          const SizedBox(height: 12),
          input(
              controller: _confirmPasswordController,
              hint: 'Confirm password',
              obscure: true),
          const SizedBox(height: 18),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              OutlinedButton(
                onPressed: () => Navigator.of(context).pop(),
                style: OutlinedButton.styleFrom(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14)),
                  side: BorderSide(color: Colors.grey.shade300),
                  foregroundColor: Colors.grey.shade800,
                ),
                child: const Text('Cancel'),
              ),
              const SizedBox(width: 10),
              ElevatedButton(
                onPressed: _save,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue.shade900,
                  foregroundColor: Colors.white,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14)),
                ),
                child: const Text('Save'),
              ),
            ],
          ),
        ],
      ),
    );

    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      backgroundColor: Colors.transparent,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 820),
        child: Material(
          color: Colors.transparent,
          child: SingleChildScrollView(
            child: dialogChild,
          ),
        ),
      ),
    );
  }
}
