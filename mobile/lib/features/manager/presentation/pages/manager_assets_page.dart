import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:pos_app/services/get_current_user.dart';
import '../bloc/manager_bloc.dart';

class ManagerAssetsPage extends StatefulWidget {
  const ManagerAssetsPage({super.key});

  @override
  State<ManagerAssetsPage> createState() => _ManagerAssetsPageState();
}

class _ManagerAssetsPageState extends State<ManagerAssetsPage> {
  final _nameController = TextEditingController();
  final _qtyController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    _qtyController.dispose();
    fetchRegisteredAssets();
    super.dispose();
  }

  void fetchRegisteredAssets() async {
    final martID = await context.read<UserProvider>().martId;
    context.read<ManagerBloc>().add(
          ManagerAssetFetchingEvent(martID: martID!),
        );
  }

  void _add() {
    final name = _nameController.text.trim();
    final qty = int.tryParse(_qtyController.text.trim()) ?? 0;

    if (name.isEmpty || qty <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Provide valid name and quantity')),
      );
      return;
    }

    final martID = context.read<UserProvider>().user?.martId ?? "";

    context.read<ManagerBloc>().add(
          ManagerAssetRegistrations(
            name: name,
            quantity: qty,
            martId: martID,
          ),
        );
  }

  void _exportCsv() {
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('Exported CSV (mock)')));
  }

  void _print() {
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('Print (mock)')));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: BlocConsumer<ManagerBloc, ManagerState>(
        listener: (context, state) {
          if (state.error != null) {
            ScaffoldMessenger.of(context)
                .showSnackBar(SnackBar(content: Text(state.error!)));
          }

          /// Clear inputs after successful add
          if (!state.loading && state.error == null) {
            _nameController.clear();
            _qtyController.clear();
          }
        },
        builder: (context, state) {
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Register company assets quickly',
                        style: TextStyle(
                            fontSize: 14, color: Colors.grey.shade700),
                      ),
                    ),
                    Row(
                      children: [
                        ElevatedButton(
                          onPressed: _exportCsv,
                          style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.blue.shade900),
                          child: const Text('Export CSV'),
                        ),
                        const SizedBox(width: 8),
                        OutlinedButton(
                          onPressed: _print,
                          child: const Text('Print'),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey.shade300),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _nameController,
                              decoration: InputDecoration(
                                hintText: 'Asset name',
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide:
                                      BorderSide(color: Colors.grey.shade200))),
                        ),
                      ),
                      const SizedBox(width: 10),
                      SizedBox(
                        height: 46,
                        child: ElevatedButton(
                            onPressed: _add,
                            style: ElevatedButton.styleFrom(
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10))),
                            child: const Text('Add')),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const SizedBox(height: 4),
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: _items.length,
                    itemBuilder: (context, idx) {
                      final item = _items[idx];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 12),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade50,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: Colors.grey.shade200),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(item.name,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w700)),
                                    const SizedBox(height: 4),
                                    Text('Qty: ${item.qty}',
                                        style: TextStyle(
                                            color: Colors.grey.shade700)),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          SizedBox(
                            width: 140,
                            child: TextField(
                              controller: _qtyController,
                              keyboardType: TextInputType.number,
                              decoration: InputDecoration(
                                hintText: 'Quantity',
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          SizedBox(
                            height: 46,
                            child: ElevatedButton(
                              onPressed:
                                  state.loading ? null : _add, // prevent spam
                              child: state.loading
                                  ? const SizedBox(
                                      height: 18,
                                      width: 18,
                                      child: CircularProgressIndicator(
                                          strokeWidth: 2),
                                    )
                                  : const Text('Add'),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 16),

                      /// 🔥 Assets List from Bloc
                      if (state.registeredAssets.isEmpty)
                        const Padding(
                          padding: EdgeInsets.all(20),
                          child: Text("No assets registered yet"),
                        ),

                      ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: state.registeredAssets.length,
                        itemBuilder: (context, idx) {
                          final item = state.registeredAssets[idx];

                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 12),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade50,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: Colors.grey.shade200),
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          item['name'],
                                          style: const TextStyle(
                                              fontWeight: FontWeight.w700),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          'Qty: ${item['quantity']}',
                                          style: TextStyle(
                                              color: Colors.grey.shade700),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
