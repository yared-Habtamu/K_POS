import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:pos_app/utils/common_modern_snackbar.dart';
import '../../../../services/get_current_user.dart';

import '../../../common_use_pages/employee_managment/presentation/widgets/employee_shimmer_effect.dart';
import '../bloc/manager_bloc.dart'; // Adjust path to your BLoC

class ManagerAlertsPage extends StatelessWidget {
  const ManagerAlertsPage({super.key});

  @override
  Widget build(BuildContext context) {
    // Trigger product fetch when page opens
    final martID = context.watch<UserProvider>().martId;
    context.read<ManagerBloc>().add(ManagerFetchProducts(martID: martID!));

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Alerts Summary'),
      ),
      body: BlocConsumer<ManagerBloc, ManagerState>(
        listener: (context, state) {
          if (state.error != null) {
            return AppSnackbar.error(state.error!);
          }
        },
        builder: (context, state) {
          if (state.loading) {
            return EmployeeManagementShimmer();
          }

          final lowStock = state.alertProducts
              .map((p) => _SummaryItem(
                    title: p.name,
                    subtitle: p.name,
                    trailingText: '${p.quantity} left',
                    danger: true,
                  ))
              .toList();

          final expiring = state.expiringSoonProducts
              .map((p) => _SummaryItem(
                    title: p.name,
                    subtitle: 'Qty: ${p.quantity}',
                    trailingText: p.expiryDate != null
                        ? '${p.expiryDate!.month}/${p.expiryDate!.day}/${p.expiryDate!.year}'
                        : 'No expiry',
                  ))
              .toList();

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 6),
                Text(
                  'alerts_summary',
                  style: TextStyle(fontSize: 14, color: Colors.grey.shade700),
                ),
                const SizedBox(height: 16),

                // Low Stock Card
                _SummaryCard(
                  icon: Icons.warning_amber_outlined,
                  title: 'Low Stock',
                  count: lowStock.length,
                  children: lowStock
                      .map(
                        (s) => _SummaryRow(
                          title: s.title,
                          subtitle: s.subtitle,
                          trailingText: s.trailingText,
                          trailingDanger: s.danger,
                        ),
                      )
                      .toList(),
                ),

                const SizedBox(height: 12),

                // Expiring Soon Card
                _SummaryCard(
                  icon: Icons.event_busy_outlined,
                  title: 'Expiring Soon',
                  count: expiring.length,
                  children: expiring
                      .map(
                        (s) => _SummaryRow(
                          title: s.title,
                          subtitle: s.subtitle,
                          trailingText: s.trailingText,
                          trailingDanger: false,
                        ),
                      )
                      .toList(),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

// ----------------------- Summary Widgets -----------------------

class _SummaryCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final int count;
  final List<Widget> children;

  const _SummaryCard({
    required this.icon,
    required this.title,
    required this.count,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: Icon(icon, color: Colors.grey.shade800),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: Text(
                  '$count',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: Colors.grey.shade800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1),
          const SizedBox(height: 8),
          ...children.map((c) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: c,
              )),
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String title;
  final String subtitle;
  final String trailingText;
  final bool trailingDanger;

  const _SummaryRow({
    required this.title,
    required this.subtitle,
    required this.trailingText,
    required this.trailingDanger,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.image, size: 20, color: Colors.grey),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: const TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade700),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: trailingDanger ? Colors.red.shade50 : Colors.grey.shade100,
              borderRadius: BorderRadius.circular(999),
              border: Border.all(
                color:
                    trailingDanger ? Colors.red.shade100 : Colors.grey.shade300,
              ),
            ),
            child: Text(
              trailingText,
              style: TextStyle(
                fontWeight: FontWeight.w700,
                color:
                    trailingDanger ? Colors.red.shade700 : Colors.grey.shade800,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SummaryItem {
  final String title;
  final String subtitle;
  final String trailingText;
  final bool danger;

  const _SummaryItem({
    required this.title,
    required this.subtitle,
    required this.trailingText,
    this.danger = false,
  });
}
