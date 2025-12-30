import 'package:flutter/material.dart';

import '../../../../config/routes/name.dart';
import '../../../../services/get_current_user.dart';

class MedicationCard extends StatelessWidget {
  final String name;
  final String dose;
  final String days;
  final Widget icon;

  const MedicationCard({
    super.key,
    required this.name,
    required this.dose,
    required this.days,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(16),
            ),
            child: icon,
          ),
          const SizedBox(width: 16),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(name,
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.bold)),
              Text(dose, style: TextStyle(color: Colors.grey.shade500)),
            ],
          ),
          const Spacer(),
          Text(days, style: TextStyle(color: Colors.grey.shade400)),
        ],
      ),
    );
  }
}

class TypeSelector extends StatelessWidget {
  final IconData icon;
  final Color color;
  final bool isSelected;

  const TypeSelector({
    super.key,
    required this.icon,
    required this.color,
    this.isSelected = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 65,
      height: 65,
      decoration: BoxDecoration(
        color: isSelected ? Colors.blue.shade50 : Colors.grey.shade50,
        shape: BoxShape.circle,
        border: isSelected
            ? Border.all(color: Colors.blue.shade200, width: 2)
            : null,
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          Icon(icon, color: color, size: 28),
          if (isSelected)
            const Positioned(
              top: 8,
              right: 8,
              child: Icon(Icons.check_circle, color: Colors.green, size: 18),
            )
        ],
      ),
    );
  }
}

void showLogoutDialog(BuildContext context) {
  showDialog(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text("Logout"),
      content: const Text("Are you sure you want to exit MediTrack?"),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text("Cancel"),
        ),
        TextButton(
          onPressed: () async {
            // 1. Clear local storage and Firebase session
            await UserProvider().logout();


            // 3. Navigate back to Sign In
            if (context.mounted) {
              Navigator.pushNamedAndRemoveUntil(
                context,
                NamedRoutes.SigninPage,
                (route) => false,
              );
            }
          },
          child: const Text("Logout", style: TextStyle(color: Colors.red)),
        ),
      ],
    ),
  );
}
