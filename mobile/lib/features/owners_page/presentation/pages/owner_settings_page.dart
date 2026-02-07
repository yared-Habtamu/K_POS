import 'package:flutter/material.dart';

import 'package:pos_app/features/marts/domain/mart_repository.dart';
import 'package:pos_app/services/api/api_client.dart';
import 'package:pos_app/services/api/auth_storage.dart';

class OwnerSettingsPage extends StatefulWidget {
  const OwnerSettingsPage({super.key});

  @override
  State<OwnerSettingsPage> createState() => _OwnerSettingsPageState();
}

class _OwnerSettingsPageState extends State<OwnerSettingsPage> {
  final _brandingFormKey = GlobalKey<FormState>();
  final _paymentsFormKey = GlobalKey<FormState>();
  final _taxFormKey = GlobalKey<FormState>();

  final TextEditingController _supermarketNameController =
      TextEditingController();
  final TextEditingController _sloganController = TextEditingController();

  String _currency = 'USD';
    String _paymentSystem = 'Telebirr';
  final TextEditingController _paymentIdentifierController =
      TextEditingController();

    final TextEditingController _otherPaymentSystemController =
      TextEditingController();

    bool _isLoadingPayments = true;
    bool _isSavingPayments = false;
    List<MapEntry<String, String>> _savedAccounts = const [];

  final TextEditingController _taxPercentController = TextEditingController();

  final MartRepository _martRepository = MartRepository();
  final AuthStorage _authStorage = AuthStorage();
  bool _isLoadingTax = true;
  bool _isSavingTax = false;
  String? _martId;
  double? _currentTaxRate;

  @override
  void dispose() {
    _supermarketNameController.dispose();
    _sloganController.dispose();
    _paymentIdentifierController.dispose();
    _otherPaymentSystemController.dispose();
    _taxPercentController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _loadMartSettings();
  }

  String _normalizePaymentKey(String raw) {
    return raw
        .toLowerCase()
        .trim()
        .replaceAll(RegExp(r'\s+'), '_')
        .replaceAll(RegExp(r'[^a-z0-9_]+'), '');
  }

  String _paymentKeyForSelection() {
    if (_paymentSystem == 'Cash') return 'cash';
    if (_paymentSystem == 'Telebirr') return 'telebirr';
    if (_paymentSystem == 'CBE Bank') return 'cbe_bank';
    if (_paymentSystem == 'Card') return 'card';
    if (_paymentSystem == 'Wallet') return 'wallet';

    // Other: allow free-typed payment system/bank name.
    final typed = _normalizePaymentKey(_otherPaymentSystemController.text);
    return typed.isNotEmpty ? typed : 'other';
  }

  void _prefillIdentifierForSelection() {
    final key = _paymentKeyForSelection();
    final existing = _savedAccounts
        .where((e) => e.key == key)
        .map((e) => e.value)
        .cast<String?>()
        .firstWhere((v) => v != null, orElse: () => null);
    if (existing != null && existing.isNotEmpty) {
      _paymentIdentifierController.text = existing;
    }
  }

  Future<void> _loadMartSettings() async {
    setState(() {
      _isLoadingTax = true;
      _isLoadingPayments = true;
    });

    try {
      final user = await _authStorage.readUser();
      final martId = user?['martId']?.toString();
      if (martId == null || martId.isEmpty) {
        if (!mounted) return;
        setState(() {
          _martId = null;
          _currentTaxRate = null;
          _isLoadingTax = false;
          _isLoadingPayments = false;
          _savedAccounts = const [];
        });
        return;
      }

      final mart = await _martRepository.getMart(martId);

      // tax
      final rawTax = mart['taxRate'];
      final tax = (rawTax is num)
          ? rawTax.toDouble()
          : (double.tryParse(rawTax?.toString() ?? '') ?? 0.0);

      // currency
      final rawCurrency = mart['currency']?.toString().trim();
      final currency = (rawCurrency == null || rawCurrency.isEmpty)
          ? _currency
          : rawCurrency;

      // payment system
      final rawPaymentSystem = mart['paymentSystem']?.toString().trim();
      String paymentSelection = _paymentSystem;
      if (rawPaymentSystem != null && rawPaymentSystem.isNotEmpty) {
        final normalized = _normalizePaymentKey(rawPaymentSystem);
        if (normalized == 'cash') {
          paymentSelection = 'Cash';
        } else if (normalized == 'telebirr') {
          paymentSelection = 'Telebirr';
        } else if (normalized == 'cbe' || normalized == 'cbe_bank') {
          paymentSelection = 'CBE Bank';
        } else if (normalized == 'card') {
          paymentSelection = 'Card';
        } else if (normalized == 'wallet') {
          paymentSelection = 'Wallet';
        } else {
          paymentSelection = 'Other';
          _otherPaymentSystemController.text = rawPaymentSystem;
        }
      }

      // saved accounts
      final List<MapEntry<String, String>> accounts = [];
      final cpf = mart['customPaymentFields'];
      if (cpf is List) {
        for (final e in cpf) {
          if (e is Map) {
            final k = e['key']?.toString() ?? '';
            final v = e['value']?.toString() ?? '';
            if (k.trim().isEmpty || v.trim().isEmpty) continue;
            accounts.add(MapEntry(_normalizePaymentKey(k), v.trim()));
          }
        }
      }

      if (!mounted) return;
      setState(() {
        _martId = martId;
        _currentTaxRate = tax;
        _taxPercentController.text = tax.toStringAsFixed(0);
        _currency = currency;
        _paymentSystem = paymentSelection;
        _savedAccounts = accounts;
        _isLoadingTax = false;
        _isLoadingPayments = false;
      });

      _prefillIdentifierForSelection();
    } catch (e) {
      final msg = e is ApiException ? e.message : 'Failed to load settings';
      if (!mounted) return;
      setState(() {
        _currentTaxRate = null;
        _isLoadingTax = false;
        _isLoadingPayments = false;
      });
      _showSaved(msg);
    }
  }

  Future<void> _savePaymentSettings() async {
    if (_isSavingPayments) return;
    final martId = _martId;
    if (martId == null || martId.isEmpty) {
      _showSaved('Missing martId for this user');
      return;
    }

    final key = _paymentKeyForSelection();
    final value = _paymentIdentifierController.text.trim();
    final isCash = key == 'cash';
    if (!isCash && value.isEmpty) {
      _showSaved('Payment account / identifier is required');
      return;
    }

    final nextAccounts = isCash
        ? _savedAccounts
        : <MapEntry<String, String>>[
            ..._savedAccounts.where((e) => e.key != key),
            MapEntry(key, value),
          ];

    setState(() => _isSavingPayments = true);

    try {
      await _martRepository.updateMart(martId, updates: {
        'currency': _currency,
        'paymentSystem': key,
        'customPaymentFields': nextAccounts
            .map((e) => {'key': e.key, 'value': e.value})
            .toList(),
      });

      if (!mounted) return;
      setState(() {
        _savedAccounts = nextAccounts;
        _paymentIdentifierController.clear();
      });
      _showSaved('Payment settings saved');
    } catch (e) {
      final msg = e is ApiException
          ? e.message
          : 'Failed to save payment settings';
      _showSaved(msg);
    } finally {
      if (!mounted) return;
      setState(() => _isSavingPayments = false);
    }
  }

  Future<void> _loadTaxRate() async {
    setState(() {
      _isLoadingTax = true;
    });

    try {
      final user = await _authStorage.readUser();
      final martId = user?['martId']?.toString();
      if (martId == null || martId.isEmpty) {
        if (!mounted) return;
        setState(() {
          _martId = null;
          _currentTaxRate = null;
          _isLoadingTax = false;
        });
        return;
      }

      final tax = await _martRepository.getTaxRate(martId);
      if (!mounted) return;
      setState(() {
        _martId = martId;
        _currentTaxRate = tax;
        _taxPercentController.text = tax.toStringAsFixed(0);
        _isLoadingTax = false;
      });
    } catch (e) {
      final msg = e is ApiException ? e.message : 'Failed to load tax rate';
      if (!mounted) return;
      setState(() {
        _currentTaxRate = null;
        _isLoadingTax = false;
      });
      _showSaved(msg);
    }
  }

  Future<void> _saveTaxRate() async {
    if (_isSavingTax) return;
    if (_taxFormKey.currentState?.validate() != true) return;
    final martId = _martId;
    if (martId == null || martId.isEmpty) {
      _showSaved('Missing martId for this user');
      return;
    }

    final parsed = double.tryParse(_taxPercentController.text.trim()) ?? 0.0;
    setState(() => _isSavingTax = true);

    try {
      final updated = await _martRepository.updateTaxRate(martId, parsed);
      if (!mounted) return;
      setState(() {
        _currentTaxRate = updated;
        _taxPercentController.text = updated.toStringAsFixed(0);
      });
      _showSaved('Tax saved');
    } catch (e) {
      final msg = e is ApiException ? e.message : 'Failed to save tax rate';
      _showSaved(msg);
    } finally {
      if (!mounted) return;
      setState(() => _isSavingTax = false);
    }
  }

  void _showSaved(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return LayoutBuilder(
      builder: (context, constraints) {
        final maxWidth = constraints.maxWidth;
        final contentMaxWidth = maxWidth >= 700 ? 640.0 : double.infinity;

        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Center(
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: contentMaxWidth),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Settings',
                    style: theme.textTheme.headlineSmall
                        ?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 16),
                  _SettingsCard(
                    title: 'Branding',
                    child: Form(
                      key: _brandingFormKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const _FieldLabel('Supermarket Name'),
                          const SizedBox(height: 8),
                          TextFormField(
                            controller: _supermarketNameController,
                            decoration: const InputDecoration(
                              hintText: 'Enter name',
                            ),
                            validator: (v) {
                              final value = (v ?? '').trim();
                              if (value.isEmpty) return 'Required';
                              return null;
                            },
                          ),
                          const SizedBox(height: 14),
                          const _FieldLabel('Logo'),
                          const SizedBox(height: 8),
                          _FakeFilePicker(
                            onPick: () =>
                                _showSaved('Logo picker not wired yet'),
                          ),
                          const SizedBox(height: 14),
                          const _FieldLabel('Slogan'),
                          const SizedBox(height: 8),
                          TextFormField(
                            controller: _sloganController,
                            decoration: const InputDecoration(
                              hintText: 'Enter slogan',
                            ),
                          ),
                          const SizedBox(height: 16),
                          Align(
                            alignment: Alignment.centerRight,
                            child: ElevatedButton(
                              onPressed: () {
                                if (_brandingFormKey.currentState?.validate() !=
                                    true) {
                                  return;
                                }
                                _showSaved('Branding saved (mock)');
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.blue.shade900,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 16, vertical: 14),
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(14)),
                              ),
                              child: const Text('Save Branding'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  _SettingsCard(
                    title: 'Payments & Currency',
                    child: Form(
                      key: _paymentsFormKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const _FieldLabel('Currency'),
                          const SizedBox(height: 8),
                          DropdownButtonFormField<String>(
                            // initialValue: _currency,
                            items: const [
                              DropdownMenuItem(
                                  value: 'USD', child: Text('USD')),
                              DropdownMenuItem(
                                  value: 'ETB', child: Text('ETB')),
                            ],
                            onChanged: (_isLoadingPayments || _isSavingPayments)
                                ? null
                                : (v) => setState(() => _currency = v ?? 'USD'),
                            decoration: const InputDecoration(),
                          ),
                          const SizedBox(height: 14),
                          const _FieldLabel('Payment System'),
                          const SizedBox(height: 8),
                          DropdownButtonFormField<String>(
                            value: _paymentSystem,
                            items: const [
                              DropdownMenuItem(
                                value: 'Cash', child: Text('Cash')),
                              DropdownMenuItem(
                                  value: 'Telebirr', child: Text('Telebirr')),
                              DropdownMenuItem(
                                  value: 'CBE Bank', child: Text('CBE Bank')),
                              DropdownMenuItem(
                                value: 'Card', child: Text('Card')),
                              DropdownMenuItem(
                                value: 'Wallet', child: Text('Wallet')),
                              DropdownMenuItem(
                                  value: 'Other', child: Text('Other')),
                            ],
                            onChanged: (_isLoadingPayments || _isSavingPayments)
                                ? null
                                : (v) {
                                    setState(() =>
                                        _paymentSystem = v ?? 'Telebirr');
                                    _prefillIdentifierForSelection();
                                  },
                            decoration: const InputDecoration(),
                          ),
                          if (_paymentSystem == 'Cash') ...[
                            const SizedBox(height: 14),
                            Text(
                              'Cash does not need an account identifier.',
                              style: TextStyle(color: Colors.grey.shade700),
                            ),
                          ] else if (_paymentSystem == 'Other') ...[
                            const SizedBox(height: 14),
                            const _FieldLabel('Payment Account / Identifier'),
                            const SizedBox(height: 8),
                            TextFormField(
                              controller: _otherPaymentSystemController,
                              enabled: !_isLoadingPayments && !_isSavingPayments,
                              decoration: const InputDecoration(
                                hintText: 'Bank name (e.g. Abyssinia Bank)',
                              ),
                            ),
                            const SizedBox(height: 10),
                            TextFormField(
                              controller: _paymentIdentifierController,
                              enabled: !_isLoadingPayments && !_isSavingPayments,
                              decoration: const InputDecoration(
                                hintText: 'Account identifier / number',
                              ),
                            ),
                          ] else ...[
                            const SizedBox(height: 14),
                            const _FieldLabel('Payment Account / Identifier'),
                            const SizedBox(height: 8),
                            TextFormField(
                              controller: _paymentIdentifierController,
                              enabled: !_isLoadingPayments && !_isSavingPayments,
                              decoration: InputDecoration(
                                hintText: _paymentSystem == 'Telebirr'
                                    ? 'Enter Telebirr number'
                                    : (_paymentSystem == 'CBE Bank'
                                        ? 'Enter CBE account number'
                                        : (_paymentSystem == 'Card'
                                            ? 'Enter card number'
                                            : 'Enter wallet identifier')),
                              ),
                            ),
                          ],

                          const SizedBox(height: 14),
                          Text('Saved Accounts',
                              style: TextStyle(
                                  fontSize: 13,
                                  color: Colors.grey.shade700,
                                  fontWeight: FontWeight.w700)),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.grey.shade50,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: Colors.grey.shade300),
                            ),
                            child: _isLoadingPayments
                                ? const Text('Loading...')
                                : (_savedAccounts.isEmpty
                                    ? Text('No saved accounts',
                                        style: TextStyle(
                                            color: Colors.grey.shade700))
                                    : Column(
                                        children: _savedAccounts
                                            .map((e) => Padding(
                                                  padding:
                                                      const EdgeInsets.only(
                                                          bottom: 8),
                                                  child: Row(
                                                    children: [
                                                      Expanded(
                                                        child: Text(
                                                          e.key,
                                                          style: TextStyle(
                                                              fontWeight:
                                                                  FontWeight
                                                                      .w700,
                                                              color: Colors
                                                                  .grey
                                                                  .shade800),
                                                        ),
                                                      ),
                                                      Text(
                                                        e.value,
                                                        style: TextStyle(
                                                            fontWeight:
                                                                FontWeight
                                                                    .w700,
                                                            color: Colors
                                                                .grey
                                                                .shade800),
                                                      ),
                                                    ],
                                                  ),
                                                ))
                                            .toList(),
                                      )),
                          ),
                          const SizedBox(height: 16),
                          Align(
                            alignment: Alignment.centerRight,
                            child: ElevatedButton(
                              onPressed:
                                  (_isLoadingPayments || _isSavingPayments)
                                      ? null
                                      : _savePaymentSettings,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.blue.shade900,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 16, vertical: 14),
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(14)),
                              ),
                              child: Text(_isSavingPayments
                                  ? 'Saving...'
                                  : 'Save Payment Settings'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  _SettingsCard(
                    title: 'Tax',
                    child: Form(
                      key: _taxFormKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const _FieldLabel('Tax Setting (%)'),
                          const SizedBox(height: 8),
                          TextFormField(
                            controller: _taxPercentController,
                            keyboardType: TextInputType.number,
                            decoration: InputDecoration(
                              hintText: _isLoadingTax
                                  ? 'Loading current tax...'
                                  : (_currentTaxRate != null
                                      ? _currentTaxRate!.toStringAsFixed(0)
                                      : 'Enter tax rate'),
                            ),
                            enabled: !_isLoadingTax && !_isSavingTax,
                            validator: (v) {
                              final raw = (v ?? '').trim();
                              if (raw.isEmpty) return 'Required';
                              final parsed = num.tryParse(raw);
                              if (parsed == null) return 'Invalid number';
                              if (parsed < 0 || parsed > 100) {
                                return 'Must be 0 - 100';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),
                          Align(
                            alignment: Alignment.centerRight,
                            child: ElevatedButton(
                              onPressed: (_isLoadingTax || _isSavingTax)
                                  ? null
                                  : _saveTaxRate,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.blue.shade900,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 16, vertical: 14),
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(14)),
                              ),
                              child: Text(_isSavingTax ? 'Saving...' : 'Save Tax'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _SettingsCard extends StatelessWidget {
  final String title;
  final Widget child;

  const _SettingsCard({
    required this.title,
    required this.child,
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
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            title,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 12),
          Theme(
            data: Theme.of(context).copyWith(
              inputDecorationTheme: InputDecorationTheme(
                filled: true,
                fillColor: Colors.grey.shade50,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide:
                      BorderSide(color: Colors.blue.shade900, width: 1.3),
                ),
              ),
            ),
            child: child,
          ),
        ],
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  final String text;

  const _FieldLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: TextStyle(
        fontSize: 13,
        color: Colors.grey.shade700,
        fontWeight: FontWeight.w600,
      ),
    );
  }
}

class _FakeFilePicker extends StatefulWidget {
  final VoidCallback onPick;

  const _FakeFilePicker({required this.onPick});

  @override
  State<_FakeFilePicker> createState() => _FakeFilePickerState();
}

class _FakeFilePickerState extends State<_FakeFilePicker> {
  String _label = 'No file chosen';

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Row(
        children: [
          OutlinedButton(
            onPressed: () {
              setState(() => _label = 'logo.png');
              widget.onPick();
            },
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Choose File'),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              _label,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: Colors.grey.shade700),
            ),
          ),
        ],
      ),
    );
  }
}
