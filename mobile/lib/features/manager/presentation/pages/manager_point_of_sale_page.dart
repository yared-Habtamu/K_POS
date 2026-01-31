import 'package:flutter/material.dart';
import 'package:pos_app/features/common_use_pages/common_point_of_sale_page.dart';
import 'package:pos_app/features/owners_page/presentation/pages/owner_pos_page.dart';

/// Manager POS reuses the owner's POS layout for now.
class PointOfSalePage extends StatelessWidget {
  const PointOfSalePage({super.key});

  @override
  Widget build(BuildContext context) {
    return  CommonPointOfSale();
  }
}
