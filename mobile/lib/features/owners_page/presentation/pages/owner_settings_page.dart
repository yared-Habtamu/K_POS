import 'package:flutter/material.dart';

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

  final TextEditingController _taxPercentController =
      TextEditingController(text: '20');

  @override
  void dispose() {
    _supermarketNameController.dispose();
    _sloganController.dispose();
    _paymentIdentifierController.dispose();
    _taxPercentController.dispose();
    super.dispose();
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
                                    true) return;
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
                            value: _currency,
                            items: const [
                              DropdownMenuItem(
                                  value: 'USD', child: Text('USD')),
                              DropdownMenuItem(
                                  value: 'ETB', child: Text('ETB')),
                            ],
                            onChanged: (v) =>
                                setState(() => _currency = v ?? 'USD'),
                            decoration: const InputDecoration(),
                          ),
                          const SizedBox(height: 14),
                          const _FieldLabel('Payment System'),
                          const SizedBox(height: 8),
                          DropdownButtonFormField<String>(
                            value: _paymentSystem,
                            items: const [
                              DropdownMenuItem(
                                  value: 'Telebirr', child: Text('Telebirr')),
                              DropdownMenuItem(
                                  value: 'CBE', child: Text('CBE Bank')),
                              DropdownMenuItem(
                                  value: 'Cash', child: Text('Cash')),
                            ],
                            onChanged: (v) => setState(
                                () => _paymentSystem = v ?? 'Telebirr'),
                            decoration: const InputDecoration(),
                          ),
                          const SizedBox(height: 14),
                          const _FieldLabel('Payment Account / Identifier'),
                          const SizedBox(height: 8),
                          TextFormField(
                            controller: _paymentIdentifierController,
                            decoration: const InputDecoration(
                              hintText: 'Enter Telebirr number',
                            ),
                          ),
                          const SizedBox(height: 16),
                          Align(
                            alignment: Alignment.centerRight,
                            child: ElevatedButton(
                              onPressed: () {
                                _showSaved('Payment settings saved (mock)');
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.blue.shade900,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 16, vertical: 14),
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(14)),
                              ),
                              child: const Text('Save Payment Settings'),
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
                            decoration: const InputDecoration(),
                            validator: (v) {
                              final raw = (v ?? '').trim();
                              if (raw.isEmpty) return 'Required';
                              final parsed = num.tryParse(raw);
                              if (parsed == null) return 'Invalid number';
                              if (parsed < 0 || parsed > 100)
                                return 'Must be 0 - 100';
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),
                          Align(
                            alignment: Alignment.centerRight,
                            child: ElevatedButton(
                              onPressed: () {
                                if (_taxFormKey.currentState?.validate() !=
                                    true) return;
                                _showSaved('Tax saved (mock)');
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.blue.shade900,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 16, vertical: 14),
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(14)),
                              ),
                              child: const Text('Save Tax'),
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
