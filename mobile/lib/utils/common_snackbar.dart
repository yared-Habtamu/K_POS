import 'package:flutter/material.dart';

import 'common_widgets.dart';

commonSnackBar(BuildContext context, String TextString, Color? TextColor,
    [Color? ContainerColor]) {
  return ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ReusableText(
            TextString: TextString,
            FontSize: 16,
            TextColor: TextColor ?? const Color.fromARGB(255, 112, 114, 112),
            TextFontWeight: FontWeight.w500,
          ),
        ],
      ),
      backgroundColor: ContainerColor ?? Colors.grey.shade300,
      elevation: 1000,
      behavior: SnackBarBehavior.floating,
      duration: const Duration(seconds: 6),
    ),
  );
}
