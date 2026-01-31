import 'package:flutter/material.dart';

class EmployeeUtils {
  static String formatYmd(DateTime d) {
    String two(int n) => n.toString().padLeft(2, '0');
    return '${d.year}-${two(d.month)}-${two(d.day)}';
  }

  static String formatTime(TimeOfDay t) {
    final h = t.hour;
    final m = t.minute.toString().padLeft(2, '0');
    final isPm = h >= 12;
    final hour12 = (h % 12 == 0) ? 12 : (h % 12);
    final ampm = isPm ? 'PM' : 'AM';
    return '${hour12.toString().padLeft(2, '0')}:$m $ampm';
  }

  static void toast(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
    );
  }
}

// --- Reusable Chips ---

class RoleChip extends StatelessWidget {
  final String role;
  const RoleChip({super.key, required this.role});

  @override
  Widget build(BuildContext context) {
    final normalized = role.trim();
    final isOwner = normalized == 'Owner';
    final isManager = normalized == 'Manager';

    final bg = isOwner ? Colors.grey.shade100 : isManager ? Colors.blue.shade900 : Colors.grey.shade100;
    final fg = isManager ? Colors.white : Colors.grey.shade800;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Text(
        normalized,
        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: fg),
      ),
    );
  }
}

class StatusChip extends StatelessWidget {
  final bool active;
  const StatusChip({super.key, required this.active});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Text(
        active ? 'active' : 'inactive',
        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.grey.shade800),
      ),
    );
  }
}

class NameCell extends StatelessWidget {
  final String name;
  const NameCell({super.key, required this.name});

  @override
  Widget build(BuildContext context) {
    final initial = name.trim().isEmpty ? '?' : name.trim().substring(0, 1).toUpperCase();
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 30,
          height: 30,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: Colors.grey.shade200,
            shape: BoxShape.circle,
          ),
          child: Text(initial, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.grey.shade800)),
        ),
        const SizedBox(width: 10),
        Text(name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
      ],
    );
  }
}