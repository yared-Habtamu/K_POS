import 'package:flutter/material.dart';
import '../../../../config/routes/name.dart';

class RegistrationStatusPage extends StatelessWidget {
  const RegistrationStatusPage({super.key});

  @override
  Widget build(BuildContext context) {
    final args =
        ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    final username = args != null ? (args['username'] as String?) : null;

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      body: Center(
        child: Card(
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          elevation: 2,
          margin: const EdgeInsets.all(24),
          child: Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Registration Status',
                    style:
                        TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                Text(
                    'Thank you — your registration is under review by the system administrator. This page will update automatically.'),
                const SizedBox(height: 12),
                if (username != null && username.isNotEmpty) ...[
                  const Text('Your account username is:',
                      style: TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 6),
                  Text(username,
                      style: const TextStyle(
                          fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                ],
                const Text(
                    'We will contact you at the phone number you provided when the request is processed. If you need help, contact:'),
                const SizedBox(height: 12),
                const Text('Email: support@smartpos.example',
                    style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                const Text('Phone: +251-936-092-577',
                    style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                Align(
                  alignment: Alignment.centerLeft,
                  child: OutlinedButton(
                    onPressed: () {
                      Navigator.pushNamedAndRemoveUntil(
                          context, NamedRoutes.SigninPage, (route) => false);
                    },
                    child: const Text('Back to Home'),
                  ),
                )
              ],
            ),
          ),
        ),
      ),
    );
  }
}
