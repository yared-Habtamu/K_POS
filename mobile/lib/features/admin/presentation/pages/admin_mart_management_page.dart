import 'package:flutter/material.dart';

import '../../data/mock_admin_data.dart';
import '../../domain/admin_shop.dart';

class AdminMartManagementPage extends StatefulWidget {
  const AdminMartManagementPage({super.key});

  @override
  State<AdminMartManagementPage> createState() => _AdminMartManagementPageState();
}

class _AdminMartManagementPageState extends State<AdminMartManagementPage> {
  late List<AdminShop> _shops;
  AdminShopStatus? _filter;

  @override
  void initState() {
    super.initState();
    _shops = MockAdminData.shops();
  }

  List<AdminShop> get _filtered {
    if (_filter == null) return _shops;
    return _shops.where((s) => s.status == _filter).toList();
  }

  void _updateStatus(String id, AdminShopStatus status, String message) {
    setState(() {
      _shops = _shops.map((s) => s.id == id ? s.copyWith(status: status) : s).toList();
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  void _deleteShop(String id) {
    setState(() {
      _shops = _shops.where((s) => s.id != id).toList();
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Shop deleted')),
    );
  }

  void _editShop(AdminShop shop) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Edit "${shop.name}" (mock)')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final shops = _filtered;

    final total = _shops.length;
    final active = _shops.where((s) => s.status == AdminShopStatus.active).length;
    final pending = _shops.where((s) => s.status == AdminShopStatus.pending).length;
    final suspended = _shops.where((s) => s.status == AdminShopStatus.suspended).length;
    final rejected = _shops.where((s) => s.status == AdminShopStatus.rejected).length;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Mart Management', style: theme.textTheme.headlineSmall),
        const SizedBox(height: 6),
        Text(
          'Approve or reject new supermarket registrations; update or delete existing shops.',
          style: theme.textTheme.bodyMedium,
        ),
        const SizedBox(height: 14),
        _StatusTabs(
          selected: _filter,
          total: total,
          active: active,
          pending: pending,
          suspended: suspended,
          rejected: rejected,
          onSelect: (value) => setState(() => _filter = value),
        ),
        const SizedBox(height: 14),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text('Registered Supermarkets', style: theme.textTheme.titleLarge),
                    ),
                    Chip(label: Text(shops.length.toString()), visualDensity: VisualDensity.compact),
                  ],
                ),
                const SizedBox(height: 12),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(minWidth: 980),
                    child: DataTable(
                      columnSpacing: 26,
                      headingRowHeight: 44,
                      dataRowMinHeight: 64,
                      dataRowMaxHeight: 84,
                      columns: const [
                        DataColumn(label: Text('Shop')),
                        DataColumn(label: Text('Owner')),
                        DataColumn(label: Text('Status')),
                        DataColumn(label: Text('Address')),
                        DataColumn(label: Text('Users')),
                        DataColumn(label: Text('Actions')),
                      ],
                      rows: shops
                          .map(
                            (s) => DataRow(
                              cells: [
                                DataCell(_ShopCell(shop: s)),
                                DataCell(Text(s.owner)),
                                DataCell(_StatusBadge(status: s.status)),
                                DataCell(
                                  Text(
                                    '${s.city}\n${s.region},\n${s.country}',
                                    style: theme.textTheme.bodySmall,
                                  ),
                                ),
                                DataCell(_UsersBadge(count: s.users)),
                                DataCell(
                                  _RowActions(
                                    shop: s,
                                    onApprove: () => _updateStatus(s.id, AdminShopStatus.active, 'Shop approved'),
                                    onReject: () => _updateStatus(s.id, AdminShopStatus.rejected, 'Shop rejected'),
                                    onSuspend: () => _updateStatus(s.id, AdminShopStatus.suspended, 'Shop suspended'),
                                    onUnsuspend: () => _updateStatus(s.id, AdminShopStatus.active, 'Shop unsuspended'),
                                    onEdit: () => _editShop(s),
                                    onDelete: () => _deleteShop(s.id),
                                  ),
                                ),
                              ],
                            ),
                          )
                          .toList(),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _StatusTabs extends StatelessWidget {
  final AdminShopStatus? selected;
  final int total;
  final int active;
  final int pending;
  final int suspended;
  final int rejected;
  final ValueChanged<AdminShopStatus?> onSelect;

  const _StatusTabs({
    required this.selected,
    required this.total,
    required this.active,
    required this.pending,
    required this.suspended,
    required this.rejected,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _StatusTab(
            label: 'All',
            count: total,
            selected: selected == null,
            onTap: () => onSelect(null),
            theme: theme,
          ),
          _StatusTab(
            label: 'Active',
            count: active,
            selected: selected == AdminShopStatus.active,
            onTap: () => onSelect(AdminShopStatus.active),
            theme: theme,
          ),
          _StatusTab(
            label: 'Pending',
            count: pending,
            selected: selected == AdminShopStatus.pending,
            onTap: () => onSelect(AdminShopStatus.pending),
            theme: theme,
          ),
          _StatusTab(
            label: 'Suspended',
            count: suspended,
            selected: selected == AdminShopStatus.suspended,
            onTap: () => onSelect(AdminShopStatus.suspended),
            theme: theme,
          ),
          _StatusTab(
            label: 'Rejected',
            count: rejected,
            selected: selected == AdminShopStatus.rejected,
            onTap: () => onSelect(AdminShopStatus.rejected),
            theme: theme,
          ),
        ],
      ),
    );
  }
}

class _StatusTab extends StatelessWidget {
  final String label;
  final int count;
  final bool selected;
  final VoidCallback onTap;
  final ThemeData theme;

  const _StatusTab({
    required this.label,
    required this.count,
    required this.selected,
    required this.onTap,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    final bg = selected ? theme.colorScheme.primary : theme.colorScheme.surface;
    final fg = selected ? theme.colorScheme.onPrimary : theme.colorScheme.onSurface;
    final border = selected ? Colors.transparent : theme.dividerColor;

    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: InkWell(
        borderRadius: BorderRadius.circular(999),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: border),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(label, style: theme.textTheme.labelLarge?.copyWith(color: fg)),
              const SizedBox(width: 10),
              Text(
                count.toString(),
                style: theme.textTheme.labelLarge?.copyWith(color: fg.withAlpha(200)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ShopCell extends StatelessWidget {
  final AdminShop shop;

  const _ShopCell({required this.shop});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final first = shop.name.trim().isNotEmpty ? shop.name.trim().characters.first.toUpperCase() : 'S';
    return Row(
      children: [
        CircleAvatar(child: Text(first)),
        const SizedBox(width: 10),
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 220),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(shop.name, style: theme.textTheme.titleSmall, overflow: TextOverflow.ellipsis, maxLines: 2),
              const SizedBox(height: 2),
              Text('owner', style: theme.textTheme.bodySmall),
            ],
          ),
        ),
      ],
    );
  }
}

class _UsersBadge extends StatelessWidget {
  final int count;

  const _UsersBadge({required this.count});

  @override
  Widget build(BuildContext context) {
    return Chip(
      label: Text(count.toString()),
      visualDensity: VisualDensity.compact,
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final AdminShopStatus status;

  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    String label;
    IconData icon;
    Color bg;
    Color fg;

    switch (status) {
      case AdminShopStatus.active:
        label = 'Active';
        icon = Icons.check_circle;
        bg = theme.colorScheme.tertiaryContainer;
        fg = theme.colorScheme.onTertiaryContainer;
        break;
      case AdminShopStatus.pending:
        label = 'Pending';
        icon = Icons.hourglass_bottom;
        bg = theme.colorScheme.secondaryContainer;
        fg = theme.colorScheme.onSecondaryContainer;
        break;
      case AdminShopStatus.suspended:
        label = 'Suspended';
        icon = Icons.block;
        bg = theme.colorScheme.errorContainer;
        fg = theme.colorScheme.onErrorContainer;
        break;
      case AdminShopStatus.rejected:
        label = 'Rejected';
        icon = Icons.cancel;
        bg = theme.colorScheme.errorContainer;
        fg = theme.colorScheme.onErrorContainer;
        break;
    }

    return Chip(
      avatar: Icon(icon, size: 16, color: fg),
      label: Text(label, style: TextStyle(color: fg)),
      backgroundColor: bg,
      visualDensity: VisualDensity.compact,
      side: BorderSide(color: fg.withAlpha(40)),
    );
  }
}

class _RowActions extends StatelessWidget {
  final AdminShop shop;
  final VoidCallback onApprove;
  final VoidCallback onReject;
  final VoidCallback onSuspend;
  final VoidCallback onUnsuspend;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _RowActions({
    required this.shop,
    required this.onApprove,
    required this.onReject,
    required this.onSuspend,
    required this.onUnsuspend,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    Widget statusAction;
    switch (shop.status) {
      case AdminShopStatus.active:
        statusAction = FilledButton(
          style: FilledButton.styleFrom(
            backgroundColor: theme.colorScheme.error,
            foregroundColor: theme.colorScheme.onError,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          ),
          onPressed: onSuspend,
          child: const Text('Suspend'),
        );
        break;
      case AdminShopStatus.suspended:
        statusAction = FilledButton(
          style: FilledButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          ),
          onPressed: onUnsuspend,
          child: const Text('Unsuspend'),
        );
        break;
      case AdminShopStatus.pending:
        statusAction = Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              tooltip: 'Approve',
              onPressed: onApprove,
              icon: Icon(Icons.check_circle, color: theme.colorScheme.tertiary),
            ),
            IconButton(
              tooltip: 'Reject',
              onPressed: onReject,
              icon: Icon(Icons.cancel, color: theme.colorScheme.error),
            ),
          ],
        );
        break;
      case AdminShopStatus.rejected:
        statusAction = const SizedBox(width: 0, height: 0);
        break;
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        statusAction,
        const SizedBox(width: 10),
        IconButton(
          tooltip: 'Edit',
          onPressed: onEdit,
          icon: const Icon(Icons.edit_outlined),
        ),
        const SizedBox(width: 6),
        SizedBox(
          width: 44,
          height: 44,
          child: FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: theme.colorScheme.error,
              foregroundColor: theme.colorScheme.onError,
              padding: EdgeInsets.zero,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: onDelete,
            child: const Icon(Icons.delete_outline),
          ),
        ),
      ],
    );
  }
}
