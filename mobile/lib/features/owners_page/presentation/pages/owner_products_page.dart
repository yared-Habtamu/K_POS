import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';

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
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  static const String _kProductsKey = 'owner_products_v1';

  Future<void> _loadProducts() async {
    final prefs = await SharedPreferences.getInstance();
    final s = prefs.getString(_kProductsKey);
    debugPrint(
        '[products] _loadProducts reading key=$_kProductsKey value=${s == null ? '<null>' : '${s.length} chars'}');
    if (s != null) {
      try {
        final List<dynamic> arr = jsonDecode(s);
        final loaded = arr
            .map((e) => _OwnerProductRow.fromJson(e as Map<String, dynamic>))
            .toList();
        debugPrint('[products] loaded ${loaded.length} items from storage');
        setState(() => _products = loaded);
      } catch (err, st) {
        debugPrint('[products] load error: $err\n$st');
        setState(
            () => _products = List<_OwnerProductRow>.from(_mockProducts()));
        await _saveProducts();
      }
    } else {
      debugPrint('[products] no stored products, seeding from mocks');
      setState(() => _products = List<_OwnerProductRow>.from(_mockProducts()));
      await _saveProducts();
    }
  }

  Future<void> _saveProducts() async {
    final prefs = await SharedPreferences.getInstance();
    final s = jsonEncode(_products.map((p) => p.toJson()).toList());
    await prefs.setString(_kProductsKey, s);
    debugPrint(
        '[products] saved ${_products.length} items (${s.length} chars) to key=$_kProductsKey');
  }

  Future<void> _onEditProduct(_OwnerProductRow p) async {
    final nameCtrl = TextEditingController(text: p.name);
    final catCtrl = TextEditingController(text: p.category);
    final purchaseCtrl =
        TextEditingController(text: p.purchasePriceEtb.toString());
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
                        if (f.bytes != null) {
                          final b64 = base64.encode(f.bytes!);
                          setStateDialog(() => newImageUrl =
                              'data:image/${f.extension ?? 'png'};base64,$b64');
                        } else if (f.path != null) {
                          setStateDialog(() => newImageUrl = f.path);
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
                  TextField(
                      controller: purchaseCtrl,
                      decoration:
                          const InputDecoration(labelText: 'Purchase Price')),
                  const SizedBox(height: 8),
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
      print('Saving edits for ${p.id}: name="$newName", cat="$newCat"');
      try {
        setState(() {
          final idx = _products.indexWhere((x) => x.id == p.id);
          if (idx >= 0) {
            _products[idx] = _OwnerProductRow(
              id: p.id,
              name: newName,
              category: newCat,
              purchasePriceEtb:
                  int.tryParse(purchaseCtrl.text.trim()) ?? p.purchasePriceEtb,
              sellingPriceEtb:
                  int.tryParse(sellingCtrl.text.trim()) ?? p.sellingPriceEtb,
              stockQty: int.tryParse(stockCtrl.text.trim()) ?? p.stockQty,
              martQty: int.tryParse(martCtrl.text.trim()) ?? p.martQty,
              imageUrl: newImageUrl,
            );
          } else {
            print('Warning: edited product id ${p.id} not found in _products');
          }
        });
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Product updated: $newName')));
      } catch (e, st) {
        print('Error updating product: $e\n$st');
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Failed to update product')));
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
      print('Deleting product ${p.id}');
      try {
        setState(() {
          _products.removeWhere((x) => x.id == p.id);
        });
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Product deleted: ${p.name}')));
      } catch (e, st) {
        print('Error deleting product: $e\n$st');
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Failed to delete product')));
      }
    }
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
                  final newP = _OwnerProductRow.fromJson(result);
                  setState(() => _products.insert(0, newP));
                  await _saveProducts();
                  ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Product added')));
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
                        DataCell(Text(p.name, overflow: TextOverflow.ellipsis)),
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
                                onPressed: () => onEdit(p),
                                icon: Icon(Icons.edit_outlined,
                                    size: 18, color: Colors.grey.shade700),
                              ),
                              IconButton(
                                tooltip: 'Delete',
                                onPressed: () => onDelete(p),
                                icon: Icon(Icons.delete_outline,
                                    size: 18, color: Colors.red.shade400),
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
        '${value} pcs',
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

  const _OwnerProductRow({
    required this.id,
    required this.name,
    required this.category,
    required this.purchasePriceEtb,
    required this.sellingPriceEtb,
    required this.stockQty,
    required this.martQty,
    this.imageUrl,
  });

  factory _OwnerProductRow.fromJson(Map<String, dynamic> j) => _OwnerProductRow(
        id: j['id'] as String,
        name: j['name'] as String? ?? '',
        category: j['category'] as String? ?? '',
        purchasePriceEtb: j['purchasePriceEtb'] is int
            ? j['purchasePriceEtb'] as int
            : int.tryParse('${j['purchasePriceEtb'] ?? 0}') ?? 0,
        sellingPriceEtb: j['sellingPriceEtb'] is int
            ? j['sellingPriceEtb'] as int
            : int.tryParse('${j['sellingPriceEtb'] ?? 0}') ?? 0,
        stockQty: j['stockQty'] is int
            ? j['stockQty'] as int
            : int.tryParse('${j['stockQty'] ?? 0}') ?? 0,
        martQty: j['martQty'] is int
            ? j['martQty'] as int
            : int.tryParse('${j['martQty'] ?? 0}') ?? 0,
        imageUrl: j['imageUrl'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'category': category,
        'purchasePriceEtb': purchasePriceEtb,
        'sellingPriceEtb': sellingPriceEtb,
        'stockQty': stockQty,
        'martQty': martQty,
        'imageUrl': imageUrl ?? ''
      };
}

List<_OwnerProductRow> _mockProducts() {
  return const [
    _OwnerProductRow(
      id: 'p1',
      name: 'Blue Magic',
      category: 'Personal Care',
      purchasePriceEtb: 350,
      sellingPriceEtb: 450,
      stockQty: 170,
      martQty: 160,
      imageUrl:
          'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=400&auto=format&fit=crop',
    ),
    _OwnerProductRow(
      id: 'p2',
      name: 'Diva',
      category: 'Household',
      purchasePriceEtb: 65,
      sellingPriceEtb: 75,
      stockQty: 0,
      martQty: 0,
      imageUrl:
          'https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?w=400&auto=format&fit=crop',
    ),
    _OwnerProductRow(
      id: 'p3',
      name: 'Fanta',
      category: 'Beverages',
      purchasePriceEtb: 30,
      sellingPriceEtb: 35,
      stockQty: 10,
      martQty: 11,
      imageUrl: '',
    ),
    _OwnerProductRow(
      id: 'p4',
      name: 'Fanta 2L',
      category: 'Beverages',
      purchasePriceEtb: 30,
      sellingPriceEtb: 35,
      stockQty: 0,
      martQty: 16,
      imageUrl: '',
    ),
    _OwnerProductRow(
      id: 'p5',
      name: 'Holand',
      category: 'Dairy',
      purchasePriceEtb: 25,
      sellingPriceEtb: 30,
      stockQty: 25,
      martQty: 40,
      imageUrl: '',
    ),
    _OwnerProductRow(
      id: 'p6',
      name: 'coca',
      category: 'Beverages',
      purchasePriceEtb: 50,
      sellingPriceEtb: 60,
      stockQty: 0,
      martQty: 78,
      imageUrl: '',
    ),
    _OwnerProductRow(
      id: 'p7',
      name: 'tab',
      category: 'Household',
      purchasePriceEtb: 50,
      sellingPriceEtb: 100,
      stockQty: 30,
      martQty: 9,
      imageUrl: '',
    ),
    _OwnerProductRow(
      id: 'p8',
      name: 'Sugar',
      category: 'Groceries',
      purchasePriceEtb: 45,
      sellingPriceEtb: 55,
      stockQty: 12,
      martQty: 22,
      imageUrl: '',
    ),
  ];
}

void _toast(BuildContext context, String message) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
}
