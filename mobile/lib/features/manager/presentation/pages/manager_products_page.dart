import 'package:flutter/material.dart';
import 'package:pos_app/features/owners_page/presentation/pages/owner_products_page.dart';

/// Simple wrapper so managers can reuse owner UI for now.
class ManagerProductsPage extends StatelessWidget {
  const ManagerProductsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const OwnerProductsPage();
  }
}
