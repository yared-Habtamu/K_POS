import 'package:flutter/material.dart';
import 'package:pos_app/features/owners_page/presentation/pages/owner_pos_page.dart';

/// Manager POS reuses the owner's POS layout for now.
class ManagerPosPage extends StatelessWidget {
  const ManagerPosPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const OwnerPosPage();
  }
}
