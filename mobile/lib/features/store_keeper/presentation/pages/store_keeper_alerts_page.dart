import 'package:flutter/material.dart';

class StoreKeeperAlertsPage extends StatelessWidget {
  const StoreKeeperAlertsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final alerts = _mockAlerts();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Alerts',
            style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 6),
          Text(
            'Low stock / expiring alerts',
            style: TextStyle(fontSize: 14, color: Colors.grey.shade700),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade300),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                LayoutBuilder(
                  builder: (context, constraints) {
                    final isNarrow = constraints.maxWidth < 420;

                    final icon = Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.grey.shade300),
                      ),
                      child: Icon(Icons.notifications_outlined, color: Colors.grey.shade800),
                    );

                    final title = const Text(
                      'Active Alerts',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
                    );

                    final count = Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(color: Colors.grey.shade300),
                      ),
                      child: Text(
                        '${alerts.length}',
                        style: TextStyle(fontWeight: FontWeight.w700, color: Colors.grey.shade800),
                      ),
                    );

                    if (isNarrow) {
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              icon,
                              const SizedBox(width: 10),
                              Expanded(child: title),
                            ],
                          ),
                          const SizedBox(height: 10),
                          count,
                        ],
                      );
                    }

                    return Row(
                      children: [
                        icon,
                        const SizedBox(width: 10),
                        Expanded(child: title),
                        const SizedBox(width: 10),
                        count,
                      ],
                    );
                  },
                ),
                const SizedBox(height: 14),
                ...alerts.map(
                  (a) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _AlertTile(alert: a),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AlertTile extends StatelessWidget {
  final _Alert alert;

  const _AlertTile({required this.alert});

  @override
  Widget build(BuildContext context) {
    final scheme = _schemeFor(alert.type, alert.severity);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isNarrow = constraints.maxWidth < 420;

          final badge = _Badge(
            text: alert.badgeText,
            fg: scheme.fg,
            bg: scheme.bg,
            border: scheme.border,
          );

          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: scheme.bg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: scheme.border),
                ),
                child: Icon(scheme.icon, color: scheme.fg),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (isNarrow) ...[
                      Text(
                        alert.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 8),
                      badge,
                    ] else ...[
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              alert.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                            ),
                          ),
                          const SizedBox(width: 10),
                          badge,
                        ],
                      ),
                    ],
                    const SizedBox(height: 4),
                    Text(
                      alert.subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 13, color: Colors.grey.shade700),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      alert.message,
                      style: TextStyle(fontSize: 13, color: Colors.grey.shade800),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  final String text;
  final Color fg;
  final Color bg;
  final Color border;

  const _Badge({
    required this.text,
    required this.fg,
    required this.bg,
    required this.border,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: border),
      ),
      child: Text(
        text,
        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: fg),
      ),
    );
  }
}

enum _AlertType { lowStock, expiring }

enum _Severity { info, warning, danger }

class _Alert {
  final _AlertType type;
  final _Severity severity;
  final String title;
  final String subtitle;
  final String message;
  final String badgeText;

  const _Alert({
    required this.type,
    required this.severity,
    required this.title,
    required this.subtitle,
    required this.message,
    required this.badgeText,
  });
}

class _AlertScheme {
  final IconData icon;
  final Color fg;
  final Color bg;
  final Color border;

  const _AlertScheme({
    required this.icon,
    required this.fg,
    required this.bg,
    required this.border,
  });
}

_AlertScheme _schemeFor(_AlertType type, _Severity severity) {
  switch (type) {
    case _AlertType.lowStock:
      if (severity == _Severity.danger) {
        return _AlertScheme(
          icon: Icons.inventory_2_outlined,
          fg: Colors.red.shade700,
          bg: Colors.red.shade50,
          border: Colors.red.shade100,
        );
      }
      return _AlertScheme(
        icon: Icons.inventory_2_outlined,
        fg: Colors.orange.shade800,
        bg: Colors.orange.shade50,
        border: Colors.orange.shade100,
      );
    case _AlertType.expiring:
      if (severity == _Severity.danger) {
        return _AlertScheme(
          icon: Icons.event_busy,
          fg: Colors.red.shade700,
          bg: Colors.red.shade50,
          border: Colors.red.shade100,
        );
      }
      return _AlertScheme(
        icon: Icons.event,
        fg: Colors.blue.shade800,
        bg: Colors.blue.shade50,
        border: Colors.blue.shade100,
      );
  }
}

List<_Alert> _mockAlerts() {
  return const [
    _Alert(
      type: _AlertType.lowStock,
      severity: _Severity.danger,
      title: 'Blue Magic',
      subtitle: 'Personal Care',
      message: 'Remaining is critically low. Consider restocking today.',
      badgeText: 'LOW STOCK',
    ),
    _Alert(
      type: _AlertType.lowStock,
      severity: _Severity.warning,
      title: 'Fanta',
      subtitle: 'Beverages',
      message: 'Stock is getting low. Plan next delivery.',
      badgeText: 'LOW STOCK',
    ),
    _Alert(
      type: _AlertType.expiring,
      severity: _Severity.warning,
      title: 'Cooking Oil',
      subtitle: 'Groceries',
      message: 'This item is expiring soon. Check FIFO and discounts.',
      badgeText: 'EXPIRING',
    ),
  ];
}
