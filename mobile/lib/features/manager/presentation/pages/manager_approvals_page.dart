import 'package:flutter/material.dart';
import 'package:pos_app/services/api/api_client.dart';
import 'package:pos_app/services/api/api_config.dart';
import 'package:pos_app/services/api/auth_storage.dart';

class ManagerApprovalsPage extends StatefulWidget {
  const ManagerApprovalsPage({super.key});

  @override
  State<ManagerApprovalsPage> createState() => _ManagerApprovalsPageState();
}

class _ManagerApprovalsPageState extends State<ManagerApprovalsPage> {
  String _status = 'Pending';
  DateTime? _from;
  DateTime? _to;
  bool _typeAdd = true;
  bool _typeEdit = true;
  bool _typeTransfer = true;

  bool _loading = false;
  String? _error;
  List<Map<String, dynamic>> _addRequests = [];
  List<Map<String, dynamic>> _editRequests = [];
  List<Map<String, dynamic>> _transferRequests = [];

  @override
  void initState() {
    super.initState();
    _loadRequests();
  }

  Future<void> _pickFrom() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _from ?? now,
      firstDate: DateTime(now.year - 5),
      lastDate: DateTime(now.year + 5),
    );
    if (picked != null) {
      setState(() => _from = picked);
      await _loadRequests();
    }
  }

  Future<void> _pickTo() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _to ?? now,
      firstDate: DateTime(now.year - 5),
      lastDate: DateTime(now.year + 5),
    );
    if (picked != null) {
      setState(() => _to = picked);
      await _loadRequests();
    }
  }

  Future<void> _loadRequests() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final auth = AuthStorage();
      final client = ApiClient(baseUrl: ApiConfig.baseUrl, authStorage: auth);

      final q = <String, String>{};
      q['status'] = _status.toLowerCase();
      if (_from != null) q['startDate'] = _from!.toIso8601String();
      if (_to != null) q['endDate'] = _to!.toIso8601String();

      final addPath =
          '${ApiConfig.apiPrefix}/product-add-requests?${Uri(queryParameters: q).query}';
      final editPath =
          '${ApiConfig.apiPrefix}/product-edit-requests?${Uri(queryParameters: q).query}';
      final transferPath =
          '${ApiConfig.apiPrefix}/stock-transfer-requests?${Uri(queryParameters: q).query}';

      final results = await Future.wait([
        client.getJson(addPath),
        client.getJson(editPath),
        client.getJson(transferPath),
      ]);

      List<dynamic> addList = [];
      List<dynamic> editList = [];
      List<dynamic> transferList = [];

      final a = results[0];
      if (a.containsKey('data') && a['data'] is List) {
        addList = a['data'] as List<dynamic>;
      }
      final b = results[1];
      if (b.containsKey('data') && b['data'] is List) {
        editList = b['data'] as List<dynamic>;
      }
      final c = results[2];
      if (c.containsKey('data') && c['data'] is List) {
        transferList = c['data'] as List<dynamic>;
      }

      setState(() {
        _addRequests = addList.cast<Map<String, dynamic>>();
        _editRequests = editList.cast<Map<String, dynamic>>();
        _transferRequests = transferList.cast<Map<String, dynamic>>();
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _addRequests = [];
        _editRequests = [];
        _transferRequests = [];
        _loading = false;
      });
    }
  }

  Future<void> _approveRequest(String id) async {
    try {
      final auth = AuthStorage();
      final client = ApiClient(baseUrl: ApiConfig.baseUrl, authStorage: auth);
      await client
          .putJson('${ApiConfig.apiPrefix}/product-add-requests/$id/approve');
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Request approved')));
      await _loadRequests();
    } catch (e) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Approve failed: $e')));
    }
  }

  Future<void> _rejectRequest(String id) async {
    final controller = TextEditingController();
    final reason = await showDialog<String?>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reject request'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(hintText: 'Reason (optional)'),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, null),
              child: const Text('Cancel')),
          TextButton(
              onPressed: () => Navigator.pop(context, controller.text.trim()),
              child: const Text('Reject')),
        ],
      ),
    );

    if (reason == null) return;

    try {
      final auth = AuthStorage();
      final client = ApiClient(baseUrl: ApiConfig.baseUrl, authStorage: auth);
      await client.putJson(
          '${ApiConfig.apiPrefix}/product-add-requests/$id/reject',
          body: {'reason': reason});
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Request rejected')));
      await _loadRequests();
    } catch (e) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Reject failed: $e')));
    }
  }

  Future<void> _approveEditRequest(String id) async {
    try {
      final auth = AuthStorage();
      final client = ApiClient(baseUrl: ApiConfig.baseUrl, authStorage: auth);
      await client
          .putJson('${ApiConfig.apiPrefix}/product-edit-requests/$id/approve');
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Edit request approved')));
      await _loadRequests();
    } catch (e) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Approve failed: $e')));
    }
  }

  Future<void> _rejectEditRequest(String id) async {
    final controller = TextEditingController();
    final reason = await showDialog<String?>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reject edit request'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(hintText: 'Reason (optional)'),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, null),
              child: const Text('Cancel')),
          TextButton(
              onPressed: () => Navigator.pop(context, controller.text.trim()),
              child: const Text('Reject')),
        ],
      ),
    );

    if (reason == null) return;

    try {
      final auth = AuthStorage();
      final client = ApiClient(baseUrl: ApiConfig.baseUrl, authStorage: auth);
      await client.putJson(
          '${ApiConfig.apiPrefix}/product-edit-requests/$id/reject',
          body: {'reason': reason});
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Edit request rejected')));
      await _loadRequests();
    } catch (e) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Reject failed: $e')));
    }
  }

  Future<void> _approveTransferRequest(String id) async {
    try {
      final auth = AuthStorage();
      final client = ApiClient(baseUrl: ApiConfig.baseUrl, authStorage: auth);
      await client.putJson(
          '${ApiConfig.apiPrefix}/stock-transfer-requests/$id/approve');
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Transfer approved')));
      await _loadRequests();
    } catch (e) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Approve failed: $e')));
    }
  }

  Future<void> _rejectTransferRequest(String id) async {
    final controller = TextEditingController();
    final reason = await showDialog<String?>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reject transfer request'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(hintText: 'Reason (optional)'),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, null),
              child: const Text('Cancel')),
          TextButton(
              onPressed: () => Navigator.pop(context, controller.text.trim()),
              child: const Text('Reject')),
        ],
      ),
    );

    if (reason == null) return;

    try {
      final auth = AuthStorage();
      final client = ApiClient(baseUrl: ApiConfig.baseUrl, authStorage: auth);
      await client.putJson(
          '${ApiConfig.apiPrefix}/stock-transfer-requests/$id/reject',
          body: {'reason': reason});
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Transfer request rejected')));
      await _loadRequests();
    } catch (e) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('Reject failed: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 6),
            Text(
              'Review product creations and stock transfers',
              style: TextStyle(fontSize: 14, color: Colors.grey.shade700),
            ),
            const SizedBox(height: 16),

            // Filters
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: Column(
                children: [
                  LayoutBuilder(
                    builder: (context, constraints) {
                      final isNarrow = constraints.maxWidth < 700;

                      final statusDropdown = Container(
                        height: 46,
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: Colors.grey.shade300),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _status,
                            items: const [
                              DropdownMenuItem(
                                  value: 'Pending', child: Text('Pending')),
                              DropdownMenuItem(
                                  value: 'Approved', child: Text('Approved')),
                              DropdownMenuItem(
                                  value: 'Rejected', child: Text('Rejected')),
                            ],
                            onChanged: (v) {
                              if (v != null) {
                                setState(() => _status = v);
                                _loadRequests();
                              }
                            },
                          ),
                        ),
                      );

                      final fromField = InkWell(
                        onTap: _pickFrom,
                        child: Container(
                          height: 46,
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: Colors.grey.shade300),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  _from == null ? 'From' : _format(_from!),
                                  style: TextStyle(
                                      color: _from == null
                                          ? Colors.grey.shade500
                                          : Colors.grey.shade800),
                                ),
                              ),
                              Icon(Icons.calendar_month,
                                  color: Colors.grey.shade700),
                            ],
                          ),
                        ),
                      );

                      final toField = InkWell(
                        onTap: _pickTo,
                        child: Container(
                          height: 46,
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: Colors.grey.shade300),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  _to == null ? 'To' : _format(_to!),
                                  style: TextStyle(
                                      color: _to == null
                                          ? Colors.grey.shade500
                                          : Colors.grey.shade800),
                                ),
                              ),
                              Icon(Icons.calendar_month,
                                  color: Colors.grey.shade700),
                            ],
                          ),
                        ),
                      );

                      final types = Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              _CheckBoxRow(
                                  label: 'Product Add',
                                  value: _typeAdd,
                                  onChanged: (v) =>
                                      setState(() => _typeAdd = v)),
                              const SizedBox(width: 8),
                              _CheckBoxRow(
                                  label: 'Product Edit',
                                  value: _typeEdit,
                                  onChanged: (v) =>
                                      setState(() => _typeEdit = v)),
                            ],
                          ),
                          const SizedBox(height: 8),
                          _CheckBoxRow(
                              label: 'Stock Transfer',
                              value: _typeTransfer,
                              onChanged: (v) =>
                                  setState(() => _typeTransfer = v)),
                        ],
                      );

                      if (isNarrow) {
                        return Column(
                          children: [
                            statusDropdown,
                            const SizedBox(height: 10),
                            Row(children: [
                              Expanded(child: fromField),
                              const SizedBox(width: 8),
                              Expanded(child: toField)
                            ]),
                            const SizedBox(height: 10),
                            types,
                          ],
                        );
                      }

                      return Row(
                        children: [
                          SizedBox(width: 200, child: statusDropdown),
                          const SizedBox(width: 10),
                          Expanded(child: fromField),
                          const SizedBox(width: 10),
                          Expanded(child: toField),
                          const SizedBox(width: 12),
                          SizedBox(width: 260, child: types),
                        ],
                      );
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14),

            // Requests sections
            const SizedBox(height: 4),
            _RequestsCard(
                title: 'Product Add Requests',
                count: _addRequests.length,
                child: _loading
                    ? const Center(
                        child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 12),
                        child: CircularProgressIndicator(),
                      ))
                    : _error != null
                        ? Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            child: Text('Error: $_error',
                                style: TextStyle(color: Colors.red.shade700)),
                          )
                        : _addRequests.isEmpty
                            ? const Text('No requests found for this filter.')
                            : Column(
                                children: _addRequests.map((r) {
                                  final payload = r['payload'] ?? {};
                                  final name =
                                      payload['name'] ?? 'Unnamed product';
                                  final requester =
                                      r['requesterName'] ?? 'Unknown';
                                  final createdAt = r['createdAt'] ?? '';
                                  final id = r['_id'] ?? r['id'];
                                  final status = r['status'] ?? '';
                                  return ListTile(
                                    contentPadding: const EdgeInsets.symmetric(
                                        horizontal: 0, vertical: 6),
                                    title: Text(name,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w700)),
                                    subtitle: Text(
                                        'By $requester • ${createdAt.toString().split('T').first}'),
                                    trailing: status == 'pending'
                                        ? Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                                TextButton(
                                                    onPressed: () =>
                                                        _rejectRequest(id),
                                                    child: const Text('Reject',
                                                        style: TextStyle(
                                                            color:
                                                                Colors.red))),
                                                const SizedBox(width: 8),
                                                ElevatedButton(
                                                  onPressed: () =>
                                                      _approveRequest(id),
                                                  child: const Text('Approve'),
                                                ),
                                              ])
                                        : Text(status,
                                            style: TextStyle(
                                                color: Colors.grey.shade600)),
                                  );
                                }).toList(),
                              )),
            const SizedBox(height: 10),
            _RequestsCard(
              title: 'Product Edit Requests',
              count: _editRequests.length,
              child: _loading
                  ? const Center(
                      child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 12),
                        child: CircularProgressIndicator(),
                      ),
                    )
                  : _error != null
                      ? Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          child: Text('Error: $_error',
                              style: TextStyle(color: Colors.red.shade700)),
                        )
                      : _editRequests.isEmpty
                          ? const Text('No pending edits.')
                          : Column(
                              children: _editRequests.map((r) {
                                final prod = r['productId'];
                                final name = (prod is Map)
                                    ? (prod['name'] ?? 'Unnamed product')
                                    : (r['productName'] ?? 'Unnamed product');
                                final requester =
                                    r['requesterName'] ?? 'Unknown';
                                final createdAt = r['createdAt'] ?? '';
                                final id = r['_id'] ?? r['id'];
                                final status = r['status'] ?? '';
                                return ListTile(
                                  contentPadding: const EdgeInsets.symmetric(
                                      horizontal: 0, vertical: 6),
                                  title: Text(name,
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w700)),
                                  subtitle: Text(
                                      'By $requester • ${createdAt.toString().split('T').first}'),
                                  trailing: status == 'pending'
                                      ? Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                              TextButton(
                                                  onPressed: () =>
                                                      _rejectEditRequest(id),
                                                  child: const Text('Reject',
                                                      style: TextStyle(
                                                          color: Colors.red))),
                                              const SizedBox(width: 8),
                                              ElevatedButton(
                                                  onPressed: () =>
                                                      _approveEditRequest(id),
                                                  child: const Text('Approve')),
                                            ])
                                      : Text(status,
                                          style: TextStyle(
                                              color: Colors.grey.shade600)),
                                );
                              }).toList(),
                            ),
            ),
            const SizedBox(height: 10),
            _RequestsCard(
              title: 'Stock Transfer Requests',
              count: _transferRequests.length,
              child: _loading
                  ? const Center(
                      child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 12),
                        child: CircularProgressIndicator(),
                      ),
                    )
                  : _error != null
                      ? Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          child: Text('Error: $_error',
                              style: TextStyle(color: Colors.red.shade700)),
                        )
                      : _transferRequests.isEmpty
                          ? const Text('No requests found for this filter.')
                          : Column(
                              children: _transferRequests.map((r) {
                                final prod = r['productId'];
                                final name = (prod is Map)
                                    ? (prod['name'] ?? 'Unnamed product')
                                    : (r['productName'] ?? 'Unnamed product');
                                final qty = r['quantity']?.toString() ?? '0';
                                final requester =
                                    r['requesterName'] ?? 'Unknown';
                                final createdAt = r['createdAt'] ?? '';
                                final id = r['_id'] ?? r['id'];
                                final status = r['status'] ?? '';
                                return ListTile(
                                  contentPadding: const EdgeInsets.symmetric(
                                      horizontal: 0, vertical: 6),
                                  title: Text('$name • $qty units',
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w700)),
                                  subtitle: Text(
                                      'By $requester • ${createdAt.toString().split('T').first}'),
                                  trailing: status == 'pending'
                                      ? Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                              TextButton(
                                                  onPressed: () =>
                                                      _rejectTransferRequest(
                                                          id),
                                                  child: const Text('Reject',
                                                      style: TextStyle(
                                                          color: Colors.red))),
                                              const SizedBox(width: 8),
                                              ElevatedButton(
                                                  onPressed: () =>
                                                      _approveTransferRequest(
                                                          id),
                                                  child: const Text('Approve')),
                                            ])
                                      : Text(status,
                                          style: TextStyle(
                                              color: Colors.grey.shade600)),
                                );
                              }).toList(),
                            ),
            ),
          ],
        ),
      ),
    );
  }

  String _format(DateTime d) {
    String two(int n) => n.toString().padLeft(2, '0');
    return '${two(d.month)}/${two(d.day)}/${d.year}';
  }
}

class _CheckBoxRow extends StatelessWidget {
  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _CheckBoxRow(
      {required this.label, required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Checkbox(value: value, onChanged: (v) => onChanged(v ?? false)),
        const SizedBox(width: 6),
        Text(label,
            style: TextStyle(fontSize: 13, color: Colors.grey.shade800)),
      ],
    );
  }
}

class _RequestsCard extends StatelessWidget {
  final String title;
  final int count;
  final Widget child;

  const _RequestsCard(
      {required this.title, required this.count, required this.child});

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
              Expanded(
                child: Text(title,
                    style: const TextStyle(
                        fontSize: 20, fontWeight: FontWeight.w700)),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: Text('$count',
                    style: const TextStyle(fontWeight: FontWeight.w700)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}
