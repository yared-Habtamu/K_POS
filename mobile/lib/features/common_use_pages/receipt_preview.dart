import 'dart:math';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../sales/domain/sale_model.dart';
import '../../services/global.dart';

Future<void> showReceiptPreviewDialog(
  BuildContext context, {
  required Sale sale,
}) async {
  final receiptId = (sale.receiptId.isNotEmpty)
      ? sale.receiptId
      : 'RCP-' + _randomString(8);
  final now = sale.date ?? DateTime.now();
  final date = DateFormat('MMM d, yyyy').format(now);
  final time = DateFormat('HH:mm:ss').format(now);
  final cashier = Global.storageServices.getUserName().isNotEmpty
      ? Global.storageServices.getUserName()
      : 'Cashier';

  final subtotal = sale.subtotal;
  final vatPct = (sale.taxRate > 0) ? (sale.taxRate / 100.0) : 0.0;
  final vat = sale.tax;
  final total = sale.total;

  final qrUrl = Uri.encodeFull('https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=$receiptId');

  await showDialog<void>(
    context: context,
    builder: (ctx) {
      final maxHeight = MediaQuery.of(ctx).size.height * 0.85;
      return Dialog(
        insetPadding: const EdgeInsets.all(16),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520),
          child: ConstrainedBox(
            constraints: BoxConstraints(maxHeight: maxHeight),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Row(
                    children: [
                      const Expanded(
                        child: Text('Receipt Preview', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
                      ),
                      IconButton(onPressed: () => Navigator.of(ctx).pop(), icon: const Icon(Icons.close)),
                    ],
                  ),
                ),
                const Divider(height: 1),
                // Content — flexible scrollable area
                Flexible(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Center(
                          child: Column(
                            children: [
                              Text('Kiya Supermarket', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.grey.shade900)),
                              const SizedBox(height: 6),
                              Text('Addis Ababa, Ethiopia', style: TextStyle(color: Colors.grey.shade700)),
                              const SizedBox(height: 6),
                              Text('+251 911 234 567', style: TextStyle(color: Colors.grey.shade700)),
                              const SizedBox(height: 8),
                              Text('Thank you for shopping with us!', style: TextStyle(color: Colors.grey.shade700, fontStyle: FontStyle.italic)),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                        const Divider(),

                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(child: Text('Receipt: $receiptId', style: const TextStyle(fontWeight: FontWeight.w500))),
                            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [Text(date), Text(time, style: TextStyle(color: Colors.grey.shade600))]),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text('Cashier: $cashier', style: TextStyle(color: Colors.grey.shade800)),
                        const SizedBox(height: 12),
                        const Divider(),

                        // Items
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8.0),
                          child: Row(
                            children: const [
                              Expanded(child: Text('Item', style: TextStyle(fontWeight: FontWeight.w700))),
                              SizedBox(width: 60, child: Text('Qty', textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.w700))),
                              SizedBox(width: 80, child: Text('Price', textAlign: TextAlign.right, style: TextStyle(fontWeight: FontWeight.w700))),
                            ],
                          ),
                        ),
                        const SizedBox(height: 6),
                        ...sale.items.map((it) {
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 6.0),
                            child: Row(
                              children: [
                                Expanded(child: Text(it.name)),
                                SizedBox(width: 60, child: Text('${it.quantity}', textAlign: TextAlign.center)),
                                SizedBox(width: 80, child: Text('${it.price.toStringAsFixed(2)}', textAlign: TextAlign.right)),
                              ],
                            ),
                          );
                        }),
                        const SizedBox(height: 12),
                        const Divider(),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [Text('Subtotal:', style: TextStyle(fontWeight: FontWeight.w600)), Text('${subtotal.toStringAsFixed(2)} ETB', style: const TextStyle(fontWeight: FontWeight.w600))],
                        ),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [Text('VAT (${(vatPct * 100).toStringAsFixed(2)}%):', style: TextStyle(fontWeight: FontWeight.w600)), Text('${vat.toStringAsFixed(2)} ETB', style: const TextStyle(fontWeight: FontWeight.w600))],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [Text('TOTAL:', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)), Text('${total.toStringAsFixed(2)} ETB', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800))],
                        ),
                        const SizedBox(height: 18),

                        Center(
                          child: Column(
                            children: [
                              Image.network(qrUrl, width: 140, height: 140),
                              const SizedBox(height: 8),
                              Text('Receipt ID: $receiptId', style: TextStyle(color: Colors.grey.shade700)),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                      ],
                    ),
                  ),
                ),
                const Divider(height: 1),
                // Actions
                Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: Row(
                    children: [
                      Expanded(
                        child: Builder(builder: (actionCtx) {
                          final isMobileLayout = MediaQuery.of(actionCtx).size.width < 600;
                          return Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              if (!isMobileLayout)
                                ElevatedButton.icon(
                                  onPressed: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Print (mock)'))),
                                  icon: const Icon(Icons.print),
                                  label: const Text('Print'),
                                  style: ElevatedButton.styleFrom(backgroundColor: Colors.blue.shade900),
                                ),
                              OutlinedButton.icon(
                                onPressed: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('PDF exported (mock)'))),
                                icon: const Icon(Icons.file_download),
                                label: const Text('PDF'),
                              ),
                              OutlinedButton.icon(
                                onPressed: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('SMS sent (mock)'))),
                                icon: const Icon(Icons.sms),
                                label: const Text('SMS'),
                              ),
                            ],
                          );
                        }),
                      ),
                      const SizedBox(width: 8),
                      SizedBox(
                        height: 44,
                        child: ElevatedButton(
                          onPressed: () {
                            Navigator.of(ctx).pop();
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Sale completed: ${total.toStringAsFixed(2)} ETB')));
                          },
                          child: const Text('done'),
                          style: ElevatedButton.styleFrom(backgroundColor: Colors.blue.shade900),
                        ),
                      ),
                    ],
                  ),
                )
              ],
            ),
          ),
        ),
      );
    },
  );
}

String _randomString(int length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  final r = Random();
  return List.generate(length, (index) => chars[r.nextInt(chars.length)]).join();
}
