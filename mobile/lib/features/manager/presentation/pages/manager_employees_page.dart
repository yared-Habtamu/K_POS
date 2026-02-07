import 'package:flutter/material.dart';
import 'package:pos_app/features/owners_page/presentation/pages/owner_employees_page.dart';
import 'package:pos_app/services/global.dart';
import 'package:provider/provider.dart';

import '../../../../services/get_current_user.dart';
import '../../../common_use_pages/employee_managment/presentation/pages/employee_managment_page.dart';

class ManagerEmployeesPage extends StatelessWidget {
  const ManagerEmployeesPage({super.key});

  @override
  Widget build(BuildContext context) {
    final userProvider = context.watch<UserProvider>();
    final currentUserId = userProvider.user?.id!.trim();
    return CommonEmployeeManagementPage(
      hideOtherManagers: true,
      currentUserId: currentUserId,
      allowedRoles: const ['Cashier', 'Store Keeper'],
    );
  }
}
