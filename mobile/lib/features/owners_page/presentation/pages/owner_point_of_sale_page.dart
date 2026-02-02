

import 'package:flutter/material.dart';

import '../../../common_use_pages/common_point_of_sale_page.dart';

class OwnerPointOfSalesPage extends StatefulWidget {
  const OwnerPointOfSalesPage({super.key});

  @override
  State<OwnerPointOfSalesPage> createState() => _OwnerPointOfSalesPageState();
}

class _OwnerPointOfSalesPageState extends State<OwnerPointOfSalesPage> {
  @override
  Widget build(BuildContext context) {
    return CommonPointOfSale();
  }
}
