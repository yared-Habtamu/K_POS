import 'package:flutter/material.dart';
import 'package:pos_app/features/owners_page/presentation/pages/owner_dashboard_page.dart';

/// Manager dashboard reuses the Owner dashboard UI for now.
class ManagerDashboardPage extends StatelessWidget {
  const ManagerDashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const OwnerDashboardPage();
  }
}
