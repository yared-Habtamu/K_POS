import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('smoke test builds a widget', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: Text('smoke'),
        ),
      ),
    );

    expect(find.text('smoke'), findsOneWidget);
  });
}
