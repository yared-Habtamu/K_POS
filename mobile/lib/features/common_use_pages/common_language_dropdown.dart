import 'package:flutter/material.dart';
import 'package:get/get.dart';

class LanguageDropdown extends StatefulWidget {
  const LanguageDropdown({super.key});

  @override
  State<LanguageDropdown> createState() => _LanguageDropdownState();
}

class _LanguageDropdownState extends State<LanguageDropdown> {
  String _selectedLanguage = 'en';

  final List<String> _languages = ['አማ', 'en', 'ኦሮ'];

  @override
  Widget build(BuildContext context) {
    return DropdownButton<String>(
      value: _selectedLanguage,
      items: _languages.map((lang) {
        return DropdownMenuItem<String>(
          value: lang,
          child: Text(lang.toUpperCase()),
        );
      }).toList(),
      onChanged: (value) {
        setState(() {
          _selectedLanguage = value!;
        });
        if(value=='አማ'){
          Get.updateLocale(Locale('am_ET'));
        }else if(value=='ኦሮ'){
          Get.updateLocale(Locale('om_ET'));
        }else{
          Get.updateLocale(Locale('en_US'));
        }
      },
    );
  }
}
