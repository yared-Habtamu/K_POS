import 'package:flutter/material.dart';

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

  Future<void> _pickFrom() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _from ?? now,
      firstDate: DateTime(now.year - 5),
      lastDate: DateTime(now.year + 5),
    );
    if (picked != null) setState(() => _from = picked);
  }

  Future<void> _pickTo() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _to ?? now,
      firstDate: DateTime(now.year - 5),
      lastDate: DateTime(now.year + 5),
    );
    if (picked != null) setState(() => _to = picked);
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Approvals',
            style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700),
          ),
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
                            if (v != null) setState(() => _status = v);
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
                                onChanged: (v) => setState(() => _typeAdd = v)),
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
              count: 0,
              child: const Text('No requests found for this filter.')),
          const SizedBox(height: 10),
          _RequestsCard(
              title: 'Product Edit Requests',
              count: 0,
              child: const Text('No pending edits.')),
          const SizedBox(height: 10),
          _RequestsCard(
              title: 'Stock Transfer Requests',
              count: 0,
              child: const Text('No requests found for this filter.')),
        ],
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
