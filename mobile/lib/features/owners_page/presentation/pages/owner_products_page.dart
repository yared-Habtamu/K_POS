import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:pos_app/features/products/domain/product_repository.dart';
import 'package:provider/provider.dart';
import 'package:pos_app/services/get_current_user.dart';
import 'package:pos_app/utils/permission_notifier.dart';

import 'owner_add_product_page.dart';

class OwnerProductsPage extends StatefulWidget {
  const OwnerProductsPage({super.key});

  @override
  State<OwnerProductsPage> createState() => _OwnerProductsPageState();
}

class _OwnerProductsPageState extends State<OwnerProductsPage> {
  final TextEditingController _searchController = TextEditingController();

  String _query = '';
  String _category = 'All Categories';

  // stateful product list so edit/delete work (persisted to SharedPreferences)
  List<_OwnerProductRow> _products = [];

  @override
  void initState() {
    super.initState();
    _loadProducts();
    PermissionNotifier.instance.addListener(_onPermissionNotification);
    // Consume any pending permission change that occurred before this page mounted
    WidgetsBinding.instance
        .addPostFrameCallback((_) => _onPermissionNotification());
  }

  @override
  void dispose() {
    _searchController.dispose();
    _pendingPollTimer?.cancel();
    PermissionNotifier.instance.removeListener(_onPermissionNotification);
    super.dispose();
  }

  void _toast(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
    );
  }

  void _onPermissionNotification() {
    final msg = PermissionNotifier.instance.consume();
    if (msg == null) return;
    if (!mounted) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    });
  }

  static const String _kProductsKey = 'owner_products_v1';

  Timer? _pendingPollTimer;

  Future<void> _loadProducts() async {
    // Try to fetch from backend first; fall back to local cached data
    try {
      final repo = ProductRepository();
      final list = await repo.listProducts();
      final rows = list
          .map((p) => _OwnerProductRow(
                id: p.id,
                name: p.name,
                category: p.category,
                purchasePriceEtb: p.purchasePrice.toInt(),
                sellingPriceEtb: p.sellingPrice.toInt(),
                stockQty: p.quantity,
                martQty: p.storeQuantity,
                imageUrl: p.imageUrl,
              ))
          .toList();
      setState(() => _products = rows);
      // persist a lightweight cache
      final prefs = await SharedPreferences.getInstance();
      final s = jsonEncode(_products.map((p) => p.toJson()).toList());
      await prefs.setString(_kProductsKey, s);

      // Stop polling if no pending items remain
      if (!_products.any((p) => p.pending) && _pendingPollTimer != null) {
        _pendingPollTimer?.cancel();
        _pendingPollTimer = null;
      }
    } catch (e, st) {
      debugPrint('[products] fetch failed: $e\n$st');
      // fallback to cached or mocks
      final prefs = await SharedPreferences.getInstance();
      final s = prefs.getString(_kProductsKey);
      if (s != null) {
        try {
          final List<dynamic> arr = jsonDecode(s);
          final loaded = arr
              .map((e) => _OwnerProductRow.fromJson(e as Map<String, dynamic>))
              .toList();
          setState(() => _products = loaded);
        } catch (_) {
          setState(() => _products = []);
        }
      } else {
        setState(() => _products = []);
      }
    }
  }

  Future<void> _saveProducts() async {
    final prefs = await SharedPreferences.getInstance();
    final s = jsonEncode(_products.map((p) => p.toJson()).toList());
    await prefs.setString(_kProductsKey, s);
    debugPrint(
        '[products] saved ${_products.length} items (${s.length} chars) to key=$_kProductsKey');

    // Start polling if any pending items exist
    if (_products.any((p) => p.pending)) {
      _startPendingPollIfNeeded();
    }
  }

  Future<void> _onEditProduct(_OwnerProductRow p) async {
    final nameCtrl = TextEditingController(text: p.name);
    final catCtrl = TextEditingController(text: p.category);
    final purchaseCtrl =
        TextEditingController(text: p.purchasePriceEtb.toString());

    final canSetPurchase = (() {
      try {
        final userProvider = Provider.of<UserProvider>(context, listen: false);
        final current = userProvider.user;
        return current != null &&
            (current.role == 'owner' ||
                (current.permissions ?? []).contains('addItem'));
      } catch (e) {
        return false;
      }
    })();
    final sellingCtrl =
        TextEditingController(text: p.sellingPriceEtb.toString());
    final stockCtrl = TextEditingController(text: p.stockQty.toString());
    final martCtrl = TextEditingController(text: p.martQty.toString());

    String? newImageUrl = p.imageUrl;

    final result = await showDialog<bool>(
      context: context,
      builder: (context) {
        return StatefulBuilder(builder: (context, setStateDialog) {
          return Dialog(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: SingleChildScrollView(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  const Text('Edit Product',
                      style:
                          TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 12),
                  // Image preview (null-safe)
                  if ((newImageUrl?.isNotEmpty ?? false)) ...[
                    Builder(builder: (context) {
                      final nn = newImageUrl!;
                      final isNetwork =
                          nn.startsWith('http') || nn.startsWith('data:');
                      return ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: SizedBox(
                          width: 80,
                          height: 80,
                          child: isNetwork
                              ? Image.network(nn, fit: BoxFit.cover)
                              : Icon(Icons.image_outlined,
                                  size: 48, color: Colors.grey.shade700),
                        ),
                      );
                    }),
                    const SizedBox(height: 8),
                  ],
                  OutlinedButton(
                    onPressed: () async {
                      final res = await FilePicker.platform.pickFiles(
                        type: FileType.image,
                        allowMultiple: false,
                        withData: true,
                      );
                      if (res != null && res.files.isNotEmpty) {
                        final f = res.files.single;
                        // prefer bytes (web) and fall back to path on non-web
                        if (f.bytes != null) {
                          final b64 = base64.encode(f.bytes!);
                          setStateDialog(() => newImageUrl =
                              'data:image/${f.extension ?? 'png'};base64,$b64');
                        } else {
                          try {
                            final p = f.path;
                            setStateDialog(() => newImageUrl = p);
                          } catch (_) {
                            // path not available on web; ignore
                          }
                        }
                      }
                    },
                    child: const Text('Choose Image'),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                      controller: nameCtrl,
                      decoration:
                          const InputDecoration(labelText: 'Product Name')),
                  const SizedBox(height: 8),
                  TextField(
                      controller: catCtrl,
                      decoration: const InputDecoration(labelText: 'Category')),
                  const SizedBox(height: 8),
                  if (canSetPurchase) ...[
                    TextField(
                      controller: purchaseCtrl,
                      decoration:
                          const InputDecoration(labelText: 'Purchase Price'),
                    ),
                    const SizedBox(height: 8),
                  ],
                  if (!canSetPurchase) const SizedBox(height: 0),
                  TextField(
                      controller: sellingCtrl,
                      decoration:
                          const InputDecoration(labelText: 'Selling Price')),
                  const SizedBox(height: 8),
                  TextField(
                      controller: stockCtrl,
                      decoration:
                          const InputDecoration(labelText: 'Stock Qty')),
                  const SizedBox(height: 8),
                  TextField(
                      controller: martCtrl,
                      decoration: const InputDecoration(labelText: 'Mart Qty')),
                  const SizedBox(height: 12),
                  Row(mainAxisAlignment: MainAxisAlignment.end, children: [
                    TextButton(
                        onPressed: () => Navigator.of(context).pop(false),
                        child: const Text('Cancel')),
                    const SizedBox(width: 8),
                    ElevatedButton(
                        onPressed: () => Navigator.of(context).pop(true),
                        child: const Text('Save'))
                  ])
                ]),
              ),
            ),
          );
        });
      },
    );

    if (result == true) {
      // debug: ensure we handle update and surface what changed
      final newName = nameCtrl.text.trim();
      final newCat = catCtrl.text.trim();
      debugPrint('Saving edits for ${p.id}: name="$newName", cat="$newCat"');
      try {
        final repo = ProductRepository();
        final fields = <String, String>{
          if (newName.isNotEmpty) 'name': newName,
          if (newCat.isNotEmpty) 'category': newCat,
          if (canSetPurchase) 'purchasePrice': purchaseCtrl.text.trim(),
          'sellingPrice': sellingCtrl.text.trim(),
          'storeQuantity': martCtrl.text.trim(),
          'quantity': stockCtrl.text.trim(),
        };

        // image handling: if newImageUrl is a data URI, we decode it; otherwise update via URL
        List<int>? bytes;
        String? filename;
        if (newImageUrl?.startsWith('data:image/') == true) {
          final parts = newImageUrl!.split(',');
          final b64 = parts.length > 1 ? parts[1] : '';
          bytes = base64.decode(b64);
          filename = 'image.png';
        }

        final res = await repo.updateProduct(p.id, fields,
            imageBytes: bytes, filename: filename);

        debugPrint('[products] update response: $res');
        if (res.containsKey('product')) {
          final prod = res['product'];
          setState(() {
            final idx = _products.indexWhere((x) => x.id == p.id);
            if (idx >= 0) {
              _products[idx] = _OwnerProductRow(
                id: prod.id,
                name: prod.name,
                category: prod.category,
                purchasePriceEtb: prod.purchasePrice.toInt(),
                sellingPriceEtb: prod.sellingPrice.toInt(),
                stockQty: prod.quantity,
                martQty: prod.storeQuantity,
                imageUrl: prod.imageUrl,
                pending: false,
                requestId: null,
              );
            }
          });
          _toast('Product updated: $newName');
        } else if (res.containsKey('requestId')) {
          // Owner updates are submitted for approval (202). Mark as pending
          setState(() {
            final idx = _products.indexWhere((x) => x.id == p.id);
            if (idx >= 0) {
              _products[idx] = _OwnerProductRow(
                id: p.id,
                name: newName.isNotEmpty ? newName : p.name,
                category: newCat.isNotEmpty ? newCat : p.category,
                purchasePriceEtb: int.tryParse(purchaseCtrl.text.trim()) ??
                    p.purchasePriceEtb,
                sellingPriceEtb:
                    int.tryParse(sellingCtrl.text.trim()) ?? p.sellingPriceEtb,
                stockQty: int.tryParse(stockCtrl.text.trim()) ?? p.stockQty,
                martQty: int.tryParse(martCtrl.text.trim()) ?? p.martQty,
                imageUrl: newImageUrl ?? p.imageUrl,
                pending: true,
                requestId: res['requestId']?.toString(),
              );
            }
          });
          await _saveProducts();
          _toast(
              'Update submitted for approval — pending (requestId=${res['requestId']})');

          // start polling backend for approval updates while pending exists
          _startPendingPollIfNeeded();
        }
      } catch (e, st) {
        debugPrint('Error updating product: $e\n$st');
        _toast('Failed to update product');
      }
    }
  }

  Future<void> _onDeleteProduct(_OwnerProductRow p) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete product?'),
        content: Text('Are you sure you want to delete ${p.name}?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel')),
          TextButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Delete', style: TextStyle(color: Colors.red))),
        ],
      ),
    );

    if (confirm == true) {
      try {
        final repo = ProductRepository();
        await repo.deleteProduct(p.id);
        setState(() {
          _products.removeWhere((x) => x.id == p.id);
        });
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Product deleted: ${p.name}')));
      } catch (e, st) {
        debugPrint('Error deleting product: $e\n$st');
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Failed to delete product')));
      }
    }
  }

  void _startPendingPollIfNeeded() {
    if (_pendingPollTimer != null) return;
    // Poll every 30 seconds while there are pending requests
    _pendingPollTimer = Timer.periodic(const Duration(seconds: 30), (_) async {
      debugPrint('[products] polling for pending approvals...');
      await _loadProducts();
      if (!_products.any((p) => p.pending)) {
        _pendingPollTimer?.cancel();
        _pendingPollTimer = null;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final allProducts = _products;

    final categories = <String>{
      'All Categories',
      ...allProducts.map((p) => p.category)
    }.toList();

    final filtered = allProducts.where((p) {
      final q = _query.trim().toLowerCase();
      final matchesQuery = q.isEmpty || p.name.toLowerCase().contains(q);
      final matchesCat =
          _category == 'All Categories' || p.category == _category;
      return matchesQuery && matchesCat;
    }).toList();

    // Match screenshot footer (showing 1-7 of 8)
    final pageItems = filtered.take(7).toList();

    return Scaffold(
      backgroundColor: Colors.white,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _Header(
              onAddProduct: () async {
                final result = await Navigator.of(context).push(
                  MaterialPageRoute(
                      builder: (_) => const OwnerAddProductPage()),
                );
                if (result != null && result is Map<String, dynamic>) {
                  // Owner flow: backend may return { requestId } (pending approval)
                  if (result.containsKey('requestId')) {
                    final pending = result['pending'] as Map<String, dynamic>?;
                    if (pending != null) {
                      final placeholder = _OwnerProductRow.fromJson({
                        'requestId': result['requestId'].toString(),
                        'name': pending['name'] ?? '',
                        'category': pending['category'] ?? '',
                        'purchasePriceEtb': pending['purchasePriceEtb'] ?? 0,
                        'sellingPriceEtb': pending['sellingPriceEtb'] ?? 0,
                        'stockQty': pending['stockQty'] ?? 0,
                        'martQty': pending['martQty'] ?? 0,
                        'imageUrl': pending['imageUrl'] ?? '',
                        'pending': true,
                      });
                      setState(() => _products.insert(0, placeholder));
                      await _saveProducts();
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                          content:
                              Text('Product submitted for manager approval')));
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                          content:
                              Text('Product submitted for manager approval')));
                    }
                  } else {
                    // Expect a product map - be defensive
                    try {
                      final newP = _OwnerProductRow.fromJson(result);
                      setState(() => _products.insert(0, newP));
                      await _saveProducts();
                      ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Product added')));
                    } catch (e, st) {
                      print('Failed to parse created product: $e\n$st');
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                          content: Text(
                              'Product created but response was unexpected')));
                    }
                  }
                }
              },
            ),
            const SizedBox(height: 16),
            _SearchAndFilterRow(
              controller: _searchController,
              categories: categories,
              selectedCategory: _category,
              onCategoryChanged: (v) => setState(() => _category = v),
              onQueryChanged: (v) => setState(() => _query = v),
            ),
            const SizedBox(height: 16),
            _ProductsTableCard(
              count: filtered.length,
              products: pageItems,
              totalCount: filtered.length,
              onEdit: _onEditProduct,
              onDelete: _onDeleteProduct,
            ),
          ],
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final VoidCallback onAddProduct;

  const _Header({required this.onAddProduct});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 650;

        final title = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(
              'Manage your product inventory',
              style: TextStyle(fontSize: 14, color: Colors.grey.shade700),
            ),
          ],
        );

        final button = ElevatedButton.icon(
          onPressed: onAddProduct,
          icon: const Icon(Icons.add, size: 18),
          label: const Text('Add Product'),
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.blue.shade900,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
        );

        if (isNarrow) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              title,
              const SizedBox(height: 12),
              button,
            ],
          );
        }

        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: title),
            button,
          ],
        );
      },
    );
  }
}

class _SearchAndFilterRow extends StatelessWidget {
  final TextEditingController controller;
  final List<String> categories;
  final String selectedCategory;
  final ValueChanged<String> onCategoryChanged;
  final ValueChanged<String> onQueryChanged;

  const _SearchAndFilterRow({
    required this.controller,
    required this.categories,
    required this.selectedCategory,
    required this.onCategoryChanged,
    required this.onQueryChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isNarrow = constraints.maxWidth < 700;

          final search = Container(
            height: 46,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.grey.shade300),
            ),
            child: Row(
              children: [
                Icon(Icons.search, color: Colors.grey.shade700),
                const SizedBox(width: 10),
                Expanded(
                  child: TextField(
                    controller: controller,
                    onChanged: onQueryChanged,
                    decoration: const InputDecoration(
                      hintText: 'Search products...',
                      border: InputBorder.none,
                    ),
                  ),
                ),
              ],
            ),
          );

          final category = Container(
            height: 46,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.grey.shade300),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                isExpanded: true,
                value: selectedCategory,
                items: categories
                    .map(
                      (c) => DropdownMenuItem<String>(
                        value: c,
                        child: Text(
                          c,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                              fontSize: 13,
                              color: Colors.grey.shade800,
                              fontWeight: FontWeight.w700),
                        ),
                      ),
                    )
                    .toList(),
                onChanged: (v) {
                  if (v != null) onCategoryChanged(v);
                },
              ),
            ),
          );

          if (isNarrow) {
            return Column(
              children: [
                search,
                const SizedBox(height: 12),
                category,
              ],
            );
          }

          return Row(
            children: [
              Expanded(child: search),
              const SizedBox(width: 12),
              SizedBox(width: 220, child: category),
            ],
          );
        },
      ),
    );
  }
}

class _ProductsTableCard extends StatelessWidget {
  final int count;
  final List<_OwnerProductRow> products;
  final int totalCount;
  final void Function(_OwnerProductRow) onEdit;
  final void Function(_OwnerProductRow) onDelete;

  const _ProductsTableCard({
    required this.count,
    required this.products,
    required this.totalCount,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: Icon(Icons.inventory_2_outlined,
                    color: Colors.grey.shade800),
              ),
              const SizedBox(width: 10),
              const Text('Products',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
              const SizedBox(width: 10),
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
                      fontWeight: FontWeight.w700, color: Colors.grey.shade800),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          // Horizontal scroll prevents right-overflow on web.
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: DataTable(
              headingRowHeight: 44,
              dataRowMinHeight: 56,
              dataRowMaxHeight: 64,
              columns: const [
                DataColumn(label: Text('Image')),
                DataColumn(label: Text('Product Name')),
                DataColumn(label: Text('Category')),
                DataColumn(label: Text('Purchase Price')),
                DataColumn(label: Text('Selling Price')),
                DataColumn(label: Text('Stock')),
                DataColumn(label: Text('Mart Qty')),
                DataColumn(label: Text('Actions')),
              ],
              rows: products
                  .map(
                    (p) => DataRow(
                      key: ValueKey(p.id),
                      cells: [
                        DataCell(_AvatarOrImage(imageUrl: p.imageUrl)),
                        DataCell(Row(children: [
                          Expanded(
                              child: Text(p.name,
                                  overflow: TextOverflow.ellipsis)),
                          if (p.pending)
                            Container(
                              margin: const EdgeInsets.only(left: 8),
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 6),
                              decoration: BoxDecoration(
                                color: Colors.orange.shade100,
                                borderRadius: BorderRadius.circular(999),
                                border:
                                    Border.all(color: Colors.orange.shade300),
                              ),
                              child: Text('Pending',
                                  style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                      color: Colors.orange.shade800)),
                            )
                        ])),
                        DataCell(_Pill(text: p.category)),
                        DataCell(Text('${p.purchasePriceEtb} ETB')),
                        DataCell(Text('${p.sellingPriceEtb} ETB')),
                        DataCell(_QtyPill(value: p.stockQty, danger: false)),
                        DataCell(_QtyPill(
                            value: p.martQty, danger: p.martQty <= 10)),
                        DataCell(
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                tooltip: 'Edit',
                                onPressed: p.pending ? null : () => onEdit(p),
                                icon: Icon(Icons.edit_outlined,
                                    size: 18,
                                    color: p.pending
                                        ? Colors.grey.shade400
                                        : Colors.grey.shade700),
                              ),
                              IconButton(
                                tooltip: 'Delete',
                                onPressed: p.pending ? null : () => onDelete(p),
                                icon: Icon(Icons.delete_outline,
                                    size: 18,
                                    color: p.pending
                                        ? Colors.grey.shade400
                                        : Colors.red.shade400),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  )
                  .toList(),
            ),
          ),
          const SizedBox(height: 14),
          LayoutBuilder(
            builder: (context, constraints) {
              final isNarrow = constraints.maxWidth < 650;

              final footerLeft = Text(
                'Showing 1-${products.length} of $totalCount products',
                style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
              );

              final pager = Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _PagerButton(label: 'Prev', enabled: false, onTap: () {}),
                  const SizedBox(width: 8),
                  _PageChip(label: '1', selected: true),
                  const SizedBox(width: 8),
                  _PageChip(label: '2', selected: false),
                  const SizedBox(width: 8),
                  _PagerButton(label: 'Next', enabled: true, onTap: () {}),
                ],
              );

              if (isNarrow) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    footerLeft,
                    const SizedBox(height: 12),
                    pager,
                  ],
                );
              }

              return Row(
                children: [
                  Expanded(child: footerLeft),
                  pager,
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class _AvatarOrImage extends StatelessWidget {
  final String? imageUrl;

  const _AvatarOrImage({required this.imageUrl});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 40,
        height: 40,
        color: Colors.grey.shade200,
        child: imageUrl == null || imageUrl!.trim().isEmpty
            ? Icon(Icons.image_outlined, color: Colors.grey.shade600)
            : Image.network(
                imageUrl!,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Icon(Icons.image_outlined,
                      color: Colors.grey.shade600);
                },
              ),
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  final String text;

  const _Pill({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Text(
        text,
        style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: Colors.grey.shade800),
      ),
    );
  }
}

class _QtyPill extends StatelessWidget {
  final int value;
  final bool danger;

  const _QtyPill({required this.value, required this.danger});

  @override
  Widget build(BuildContext context) {
    final bg = danger ? Colors.red.shade400 : Colors.blueGrey.shade100;
    final fg = danger ? Colors.white : Colors.grey.shade800;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        '$value pcs',
        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: fg),
      ),
    );
  }
}

class _PagerButton extends StatelessWidget {
  final String label;
  final bool enabled;
  final VoidCallback onTap;

  const _PagerButton({
    required this.label,
    required this.enabled,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: enabled ? onTap : null,
      style: OutlinedButton.styleFrom(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      ),
      child: Text(label),
    );
  }
}

class _PageChip extends StatelessWidget {
  final String label;
  final bool selected;

  const _PageChip({required this.label, required this.selected});

  @override
  Widget build(BuildContext context) {
    if (selected) {
      return Container(
        width: 34,
        height: 34,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: Colors.blue.shade900,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          label,
          style:
              const TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
        ),
      );
    }

    return Container(
      width: 34,
      height: 34,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Text(
        label,
        style:
            TextStyle(color: Colors.grey.shade800, fontWeight: FontWeight.w800),
      ),
    );
  }
}

class _OwnerProductRow {
  final String id;
  final String name;
  final String category;
  final int purchasePriceEtb;
  final int sellingPriceEtb;
  final int stockQty;
  final int martQty;
  final String? imageUrl;
  final bool pending;
  final String? requestId;

  const _OwnerProductRow({
    required this.id,
    required this.name,
    required this.category,
    required this.purchasePriceEtb,
    required this.sellingPriceEtb,
    required this.stockQty,
    required this.martQty,
    this.imageUrl,
    this.pending = false,
    this.requestId,
  });

  factory _OwnerProductRow.fromJson(Map<String, dynamic> j) {
    final requestId =
        (j['requestId'] as String?) ?? (j['request_id'] as String?);
    final isPending =
        requestId != null || j['pending'] == true || j['pending'] is Map;
    final rawId = j['id'] ??
        j['_id'] ??
        j['productId'] ??
        (isPending ? 'pending:${requestId ?? ''}' : null);
    final idStr = rawId != null ? rawId.toString() : '';

    String? pendingString(String key) {
      if (j[key] is String) return j[key] as String;
      if (j['pending'] is Map && j['pending'][key] != null) {
        return j['pending'][key].toString();
      }
      return null;
    }

    int parseInt(dynamic v, [int fallback = 0]) {
      if (v is int) return v;
      if (v is String) return int.tryParse(v) ?? fallback;
      return fallback;
    }

    return _OwnerProductRow(
      id: idStr,
      name: (j['name'] as String?) ?? pendingString('name') ?? '',
      category: (j['category'] as String?) ?? pendingString('category') ?? '',
      purchasePriceEtb: parseInt(
          j['purchasePriceEtb'] ??
              (j['pending'] is Map ? j['pending']['purchasePriceEtb'] : null),
          0),
      sellingPriceEtb: parseInt(
          j['sellingPriceEtb'] ??
              (j['pending'] is Map ? j['pending']['sellingPriceEtb'] : null),
          0),
      stockQty: parseInt(
          j['stockQty'] ??
              (j['pending'] is Map ? j['pending']['stockQty'] : null),
          0),
      martQty: parseInt(
          j['martQty'] ??
              (j['pending'] is Map ? j['pending']['martQty'] : null),
          0),
      imageUrl: (j['imageUrl'] as String?) ??
          (j['pending'] is Map ? j['pending']['imageUrl'] as String? : null),
      pending: isPending,
      requestId: requestId ??
          (j['pending'] is Map ? (j['pending']['requestId'] as String?) : null),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'category': category,
        'purchasePriceEtb': purchasePriceEtb,
        'sellingPriceEtb': sellingPriceEtb,
        'stockQty': stockQty,
        'martQty': martQty,
        'imageUrl': imageUrl ?? '',
        'pending': pending,
        'requestId': requestId,
      };
}

// removed top-level helper `_toast` to avoid conflicts with the
// instance-level `_toast` defined on the State class.
