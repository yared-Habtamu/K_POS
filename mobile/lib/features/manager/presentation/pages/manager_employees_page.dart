import 'package:flutter/material.dart';
import 'package:pos_app/services/global.dart';

import '../../../common_use_pages/employee_managment/presentation/pages/employee_managment_page.dart';

class ManagerEmployeesPage extends StatelessWidget {
  const ManagerEmployeesPage({super.key});

  @override
  Widget build(BuildContext context) {
    final id = Global.storageServices.getUserId();
    final currentUserId = id.trim().isEmpty ? null : id;
    return CommonEmployeeManagementPage(
      hideOtherManagers: true,
      currentUserId: currentUserId,
      allowedRoles: const ['Cashier', 'Store Keeper'],
    );
  }
}
