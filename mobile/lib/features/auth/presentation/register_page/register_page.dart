import 'package:flutter/material.dart';
import '../../../../config/routes/name.dart';

class RegisterMartPage extends StatefulWidget {
  const RegisterMartPage({super.key});

  @override
  State<RegisterMartPage> createState() => _RegisterMartPageState();
}

class _RegisterMartPageState extends State<RegisterMartPage> {
  final _formKey = GlobalKey<FormState>();
  final _martNameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _countryCtrl = TextEditingController(text: 'Ethiopia');
  final _regionCtrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _ownerNameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _usernameCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Register Your Supermarket'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Card(
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          elevation: 2,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _buildTextField(
                      _martNameCtrl, 'Mart Name', 'e.g. Kebele Supermarket'),
                  const SizedBox(height: 12),
                  _buildTextField(_emailCtrl, 'Email', 'owner@company.com',
                      keyboard: TextInputType.emailAddress),
                  const SizedBox(height: 12),
                  _buildTextField(_countryCtrl, 'Country', '', readOnly: true),
                  const SizedBox(height: 12),
                  _buildDropdownRegion(),
                  const SizedBox(height: 12),
                  _buildTextField(_cityCtrl, 'City', 'Addis Ababa'),
                  const SizedBox(height: 12),
                  _buildTextField(_addressCtrl, 'Address', 'Street, area'),
                  const SizedBox(height: 12),
                  _buildTextField(_ownerNameCtrl, 'Owner Name', 'Full name'),
                  const SizedBox(height: 12),
                  _buildTextField(_phoneCtrl, 'Phone', '+251 9xx xxx xxx',
                      keyboard: TextInputType.phone),
                  const SizedBox(height: 12),
                  _buildTextField(
                      _usernameCtrl, 'Owner Username', 'choose-a-username'),
                  const SizedBox(height: 12),
                  _buildTextField(
                      _passwordCtrl, 'Password', 'Choose a secure password',
                      obscure: true),
                  const SizedBox(height: 12),
                  _buildTextField(
                      _confirmCtrl, 'Confirm Password', 'Confirm password',
                      obscure: true),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: () {
                      if (_formKey.currentState?.validate() ?? false) {
                        // In real app, send registration request to backend
                        Navigator.pushNamed(
                            context, NamedRoutes.RegistrationStatusPage);
                      }
                    },
                    child: const Padding(
                      padding: EdgeInsets.symmetric(vertical: 14.0),
                      child: Text('Send Registration'),
                    ),
                  )
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField(TextEditingController ctrl, String label, String hint,
      {TextInputType keyboard = TextInputType.text,
      bool obscure = false,
      bool readOnly = false}) {
    return TextFormField(
      controller: ctrl,
      readOnly: readOnly,
      keyboardType: keyboard,
      obscureText: obscure,
      decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8))),
      validator: (v) {
        if (!readOnly && (v == null || v.trim().isEmpty))
          return 'This field is required';
        return null;
      },
    );
  }

  Widget _buildDropdownRegion() {
    final regions = [
      'Select region',
      'Addis Ababa',
      'Oromia',
      'Tigray',
      'Amhara',
      'Dire Dawa',
      'Afar',
      'Somali',
      'Benishangul-Gumz',
      'SNNPR',
      'Gambela',
      'Harari'
    ];
    return DropdownButtonFormField<String>(
      value: regions[0],
      items: regions
          .map((e) => DropdownMenuItem(value: e, child: Text(e)))
          .toList(),
      onChanged: (v) => setState(() => _regionCtrl.text = v ?? ''),
      decoration: InputDecoration(
          labelText: 'Region',
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8))),
      validator: (v) {
        if (v == null || v == regions[0]) return 'Please select a region';
        return null;
      },
    );
  }
}
