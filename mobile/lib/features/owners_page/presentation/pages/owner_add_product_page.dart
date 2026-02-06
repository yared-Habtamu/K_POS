import 'package:flutter/material.dart';
import 'dart:typed_data';
import 'package:file_picker/file_picker.dart';
import 'package:pos_app/features/products/domain/product_repository.dart';
import 'package:pos_app/features/common_use_pages/reusable_qr_scanner_page.dart';
import 'package:pos_app/services/global.dart';
import 'package:pos_app/utils/common_widgets.dart';

class OwnerAddProductPage extends StatefulWidget {
  const OwnerAddProductPage({super.key});

  @override
  State<OwnerAddProductPage> createState() => _OwnerAddProductPageState();
}

class _OwnerAddProductPageState extends State<OwnerAddProductPage> {
  final _nameController = TextEditingController();
  final _quantityController = TextEditingController();
  final _purchasePriceController = TextEditingController();
  final _sellingPriceController = TextEditingController();
  final _lowStockController = TextEditingController(text: '10');
  final _barcodeController = TextEditingController();

  String _category = 'Select category';
  String _unit = 'PCS';
  DateTime? _expiryDate;

  final List<String> _barcodes = [];

  String? _selectedImageName;
  String? _selectedImagePath;
  Uint8List? _selectedImageBytes;

  @override
  void dispose() {
    _nameController.dispose();
    _quantityController.dispose();
    _purchasePriceController.dispose();
    _sellingPriceController.dispose();
    _lowStockController.dispose();
    _barcodeController.dispose();
    super.dispose();
  }

  void _toast(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
    );
  }

  Future<void> _pickExpiryDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _expiryDate ?? now,
      firstDate: DateTime(now.year - 5),
      lastDate: DateTime(now.year + 10),
    );
    if (picked == null) return;
    setState(() => _expiryDate = picked);
  }

  String _formatDate(DateTime d) {
    String two(int n) => n.toString().padLeft(2, '0');
    return '${two(d.month)}/${two(d.day)}/${d.year}';
  }

  void _addBarcode() {
    final v = _barcodeController.text.trim();
    if (v.isEmpty) return;
    if (_barcodes.contains(v)) {
      _toast('Barcode already added');
      return;
    }
    setState(() {
      _barcodes.add(v);
      _barcodeController.clear();
    });
  }

  void _generateBarcode() {
    // Mock only (no extra deps / real generation needed).
    final v = DateTime.now().millisecondsSinceEpoch.toString();
    if (_barcodes.contains(v)) return;
    setState(() => _barcodes.add(v));
  }

  Future<void> _saveProduct() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      _toast('Product name is required');
      return;
    }
    try {
      final repo = ProductRepository();

      final fields = <String, String>{
        'name': name,
        'category':
            _category == 'Select category' ? 'Uncategorized' : _category,
        'purchasePrice': _purchasePriceController.text.trim(),
        'sellingPrice': _sellingPriceController.text.trim(),
        'quantity': _quantityController.text.trim(),
        'lowStockThreshold': _lowStockController.text.trim(),
      };

      if (_barcodes.isNotEmpty) fields['barcode'] = _barcodes.first;

      final filename = _selectedImageName;
      final bytes = _selectedImageBytes;

      final res = await repo.createProduct(fields,
          imageBytes: bytes, filename: filename);

      if (res.containsKey('product')) {
        final created = res['product'];
        _toast('Saved');
        Navigator.of(context).pop({
          'id': created.id,
          'name': created.name,
          'category': created.category,
          'purchasePriceEtb': created.purchasePrice.toInt(),
          'sellingPriceEtb': created.sellingPrice.toInt(),
          'stockQty': created.quantity,
          'martQty': created.storeQuantity,
          'imageUrl': created.imageUrl ?? ''
        });
      } else if (res.containsKey('requestId')) {
        _toast('Product submitted for approval');
        // return pending payload so UI can show a placeholder
        final payload = {
          'name': fields['name'] ?? '',
          'category': fields['category'] ?? '',
          'purchasePriceEtb': int.tryParse(fields['purchasePrice'] ?? '0') ?? 0,
          'sellingPriceEtb': int.tryParse(fields['sellingPrice'] ?? '0') ?? 0,
          'stockQty': int.tryParse(fields['quantity'] ?? '0') ?? 0,
          'martQty': int.tryParse(fields['storeQuantity'] ?? '0') ?? 0,
          'imageUrl': filename ?? ''
        };
        Navigator.of(context)
            .pop({'requestId': res['requestId'], 'pending': payload});
      } else {
        _toast('Unexpected response from server');
      }
    } catch (e, st) {
      print('Error creating product: $e\n$st');
      final msg = e is Exception ? e.toString() : 'Failed to create product';
      _toast(msg);
    }
  }

  @override
  Widget build(BuildContext context) {
    final categories = const <String>[
      'Select category',
      'Beverage',
      'Snacks',
      'Dairy',
      'Household'
    ];
    final units = const <String>['PCS', 'KG', 'L'];

    return Scaffold(
      backgroundColor: Colors.grey.shade100,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.of(context).maybePop(),
                    icon: const Icon(Icons.arrow_back_ios),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Add Product',
                          style: TextStyle(
                              fontSize: 28, fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'product_add_description',
                          style: TextStyle(
                              fontSize: 14, color: Colors.grey.shade700),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () {
                      // Show the standard logout dialog
                      Global.storageServices.setDeviceOpenedFirst(false);
                      LogoutShowDialogue(context);
                    },
                    icon: const Icon(Icons.logout_outlined),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _Card(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _ImagePickerCard(
                      selectedFileName: _selectedImageName,
                      onChooseImage: () async {
                        final result = await FilePicker.platform.pickFiles(
                          type: FileType.image,
                          allowMultiple: false,
                          withData: true,
                        );
                        if (result != null && result.files.isNotEmpty) {
                          final f = result.files.single;
                          setState(() {
                            _selectedImageName = f.name;
                            // On web `path` is not available; prefer `bytes` when present
                            if (f.bytes != null) {
                              _selectedImageBytes = f.bytes;
                              _selectedImagePath = null;
                            } else {
                              try {
                                if (f.path != null) {
                                  _selectedImagePath = f.path;
                                  _selectedImageBytes = null;
                                }
                              } catch (_) {
                                // path not available on some platforms (web)
                                _selectedImagePath = null;
                                _selectedImageBytes = null;
                              }
                            }
                          });
                          _toast('Selected image: ${f.name}');
                        }
                      },
                      onTakePhoto: () => _toast('Take Photo (mock)'),
                    ),
                    const SizedBox(height: 16),
                    LayoutBuilder(
                      builder: (context, constraints) {
                        final isNarrow = constraints.maxWidth < 700;

                        final left = Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _Labeled(
                              label: 'Product Name *',
                              child: _Input(
                                controller: _nameController,
                                hintText: '',
                              ),
                            ),
                            const SizedBox(height: 14),
                            _Labeled(
                              label: 'Unit *',
                              child: _Dropdown(
                                value: _unit,
                                items: units,
                                onChanged: (v) => setState(() => _unit = v),
                              ),
                            ),
                            const SizedBox(height: 14),
                            _Labeled(
                              label: 'Purchase Price (ETB) *',
                              child: _Input(
                                controller: _purchasePriceController,
                                hintText: '',
                                keyboardType: TextInputType.number,
                              ),
                            ),
                            const SizedBox(height: 14),
                            _Labeled(
                              label: 'Low Stock Threshold',
                              child: _Input(
                                controller: _lowStockController,
                                hintText: '',
                                keyboardType: TextInputType.number,
                              ),
                            ),
                          ],
                        );

                        final right = Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _Labeled(
                              label: 'Category *',
                              child: _Dropdown(
                                value: _category,
                                items: categories,
                                onChanged: (v) => setState(() => _category = v),
                              ),
                            ),
                            const SizedBox(height: 14),
                            _Labeled(
                              label: 'Quantity *',
                              child: _Input(
                                controller: _quantityController,
                                hintText: '',
                                keyboardType: TextInputType.number,
                              ),
                            ),
                            const SizedBox(height: 14),
                            _Labeled(
                              label: 'Selling Price (ETB) *',
                              child: _Input(
                                controller: _sellingPriceController,
                                hintText: '',
                                keyboardType: TextInputType.number,
                              ),
                            ),
                            const SizedBox(height: 14),
                            _Labeled(
                              label: 'Expiry Date',
                              child: _DateField(
                                text: _expiryDate == null
                                    ? 'mm/dd/yyyy'
                                    : _formatDate(_expiryDate!),
                                onPick: _pickExpiryDate,
                              ),
                            ),
                          ],
                        );

                        if (isNarrow) {
                          return Column(
                            children: [
                              left,
                              const SizedBox(height: 14),
                              right,
                            ],
                          );
                        }

                        return Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(child: left),
                            const SizedBox(width: 16),
                            Expanded(child: right),
                          ],
                        );
                      },
                    ),
                    const SizedBox(height: 16),
                    _BarcodesSection(
                      controller: _barcodeController,
                      barcodes: _barcodes,
                      onAdd: _addBarcode,
                      onGenerate: _generateBarcode,
                      onRemove: (code) =>
                          setState(() => _barcodes.remove(code)),
                    ),
                    const SizedBox(height: 18),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        OutlinedButton(
                          onPressed: () => Navigator.of(context).maybePop(),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 18, vertical: 14),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14)),
                            side: BorderSide(color: Colors.grey.shade300),
                            foregroundColor: Colors.grey.shade800,
                          ),
                          child: const Text('Cancel'),
                        ),
                        const SizedBox(width: 10),
                        ElevatedButton(
                          onPressed: () {
                            _saveProduct();
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.blue.shade900,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(
                                horizontal: 18, vertical: 14),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14)),
                          ),
                          child: const Text('Save'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Card extends StatelessWidget {
  final Widget child;

  const _Card({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: child,
    );
  }
}

class _ImagePickerCard extends StatelessWidget {
  final VoidCallback onChooseImage;
  final VoidCallback onTakePhoto;
  final String? selectedFileName;

  const _ImagePickerCard({
    required this.onChooseImage,
    required this.onTakePhoto,
    this.selectedFileName,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isNarrow = constraints.maxWidth < 520;

          final leftIcon = Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.grey.shade300),
            ),
            child: Icon(Icons.image_outlined, color: Colors.grey.shade800),
          );

          final text = Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Product Image',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
              ),
              const SizedBox(height: 4),
              Text(
                'Drag & drop an image, pick from device, or take a photo.',
                style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  OutlinedButton(
                    onPressed: onChooseImage,
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 12),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                      side: BorderSide(color: Colors.grey.shade300),
                      foregroundColor: Colors.grey.shade800,
                    ),
                    child: const Text('Choose Image'),
                  ),
                  OutlinedButton(
                    onPressed: onTakePhoto,
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 12),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                      side: BorderSide(color: Colors.grey.shade300),
                      foregroundColor: Colors.grey.shade800,
                    ),
                    child: const Text('Take Photo'),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              // show selected file name if present
              Builder(builder: (context) {
                if (selectedFileName == null) {
                  return const SizedBox.shrink();
                }
                return Text('Selected: $selectedFileName',
                    style:
                        TextStyle(fontSize: 12, color: Colors.grey.shade700));
              }),
            ],
          );

          if (isNarrow) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    leftIcon,
                    const SizedBox(width: 12),
                    Expanded(child: text),
                  ],
                ),
              ],
            );
          }

          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              leftIcon,
              const SizedBox(width: 12),
              Expanded(child: text),
            ],
          );
        },
      ),
    );
  }
}

class _Labeled extends StatelessWidget {
  final String label;
  final Widget child;

  const _Labeled({required this.label, required this.child});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
              fontSize: 13,
              color: Colors.grey.shade800,
              fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 8),
        child,
      ],
    );
  }
}

class _Input extends StatelessWidget {
  final TextEditingController controller;
  final String hintText;
  final TextInputType? keyboardType;

  const _Input({
    required this.controller,
    required this.hintText,
    this.keyboardType,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 46,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Center(
        child: TextField(
          controller: controller,
          keyboardType: keyboardType,
          decoration: InputDecoration(
            hintText: hintText,
            hintStyle: TextStyle(color: Colors.grey.shade500, fontSize: 13),
            border: InputBorder.none,
            isCollapsed: true,
          ),
        ),
      ),
    );
  }
}

class _Dropdown extends StatelessWidget {
  final String value;
  final List<String> items;
  final ValueChanged<String> onChanged;

  const _Dropdown({
    required this.value,
    required this.items,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
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
          value: value,
          icon: Icon(Icons.keyboard_arrow_down_rounded,
              color: Colors.grey.shade700),
          items: items
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
            if (v != null) onChanged(v);
          },
        ),
      ),
    );
  }
}

class _DateField extends StatelessWidget {
  final String text;
  final VoidCallback onPick;

  const _DateField({required this.text, required this.onPick});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onPick,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        height: 46,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                text,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                    fontSize: 13,
                    color: text == 'mm/dd/yyyy'
                        ? Colors.grey.shade500
                        : Colors.grey.shade800),
              ),
            ),
            const SizedBox(width: 8),
            Icon(Icons.calendar_month_outlined,
                size: 18, color: Colors.grey.shade700),
          ],
        ),
      ),
    );
  }
}

class _BarcodesSection extends StatelessWidget {
  final TextEditingController controller;
  final List<String> barcodes;
  final VoidCallback onAdd;
  final VoidCallback onGenerate;
  final ValueChanged<String> onRemove;

  const _BarcodesSection({
    required this.controller,
    required this.barcodes,
    required this.onAdd,
    required this.onGenerate,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'barcodes',
          style: TextStyle(
              fontSize: 13,
              color: Colors.grey.shade800,
              fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 8),
        LayoutBuilder(
          builder: (context, constraints) {
            final isNarrow = constraints.maxWidth < 650;

            final input = Expanded(
              child: Container(
                height: 46,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: Center(
                  child: TextField(
                    controller: controller,
                    decoration: InputDecoration(
                      hintText: 'Enter barcode to add',
                      border: InputBorder.none,
                      isCollapsed: true,
                      suffixIcon: IconButton(
                        onPressed: () async {
                          // Navigate to scanner
                          final result = await Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (context) =>
                                    const BarcodeScannerPage()),
                          );

                          // Handle result if it exists
                          if (result != null) {
                            controller.text = result;
                            print("Scanned Code: $result");
                            // Do something with 'result'
                          }
                        },
                        icon: Icon(
                          Icons.qr_code_scanner,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            );

            final addBtn = OutlinedButton(
              onPressed: onAdd,
              style: OutlinedButton.styleFrom(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
                side: BorderSide(color: Colors.grey.shade300),
                foregroundColor: Colors.grey.shade800,
              ),
              child: const Text('Add'),
            );

            final genBtn = OutlinedButton.icon(
              onPressed: onGenerate,
              icon: const Icon(Icons.qr_code_2, size: 18),
              label: const Text('Generate'),
              style: OutlinedButton.styleFrom(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
                side: BorderSide(color: Colors.grey.shade300),
                foregroundColor: Colors.grey.shade800,
              ),
            );

            if (isNarrow) {
              return Column(
                children: [
                  Row(children: [input]),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(child: addBtn),
                      const SizedBox(width: 10),
                      Expanded(child: genBtn),
                    ],
                  ),
                ],
              );
            }

            return Row(
              children: [
                input,
                const SizedBox(width: 10),
                addBtn,
                const SizedBox(width: 10),
                genBtn,
              ],
            );
          },
        ),
        const SizedBox(height: 10),
        Text(
          'Previously registered barcodes are shown above. Add or generate new ones.',
          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
        ),
        const SizedBox(height: 10),
        if (barcodes.isNotEmpty)
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: barcodes
                .map(
                  (b) => InputChip(
                    label: Text(
                      b,
                      style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade800,
                          fontWeight: FontWeight.w700),
                    ),
                    onDeleted: () => onRemove(b),
                    deleteIconColor: Colors.grey.shade700,
                    backgroundColor: Colors.grey.shade100,
                    side: BorderSide(color: Colors.grey.shade300),
                  ),
                )
                .toList(),
          ),
      ],
    );
  }
}
