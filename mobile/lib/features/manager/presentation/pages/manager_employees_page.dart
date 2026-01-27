import 'package:flutter/material.dart';
import 'package:pos_app/features/owners_page/presentation/pages/owner_employees_page.dart';
import 'package:pos_app/services/global.dart';

class ManagerEmployeesPage extends StatelessWidget {
  const ManagerEmployeesPage({super.key});

  @override
  Widget build(BuildContext context) {
    final id = Global.storageServices.getUserId();
    final currentUserId = id.trim().isEmpty ? null : id;
    return OwnerEmployeesPage(
      hideOtherManagers: true,
      currentUserId: currentUserId,
      allowedRoles: const ['Cashier', 'Store Keeper'],
    );
  }
}
