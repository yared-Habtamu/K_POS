import 'package:flutter/material.dart';

class SlideRoute extends PageRouteBuilder {
  final Widget page;
  @override
  final RouteSettings settings;
  SlideRoute({required this.page, required this.settings})
      : super(
          pageBuilder: (context, animation, secondaryAnimation) => page,
          transitionDuration:
              const Duration(milliseconds: 400), // Speed going IN
          reverseTransitionDuration:
              const Duration(milliseconds: 300), // Speed going OUT
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            // New page sliding in from the right
            var slideIn = Tween(begin: const Offset(1.0, 0.0), end: Offset.zero)
                .animate(CurvedAnimation(
                    parent: animation, curve: Curves.easeInOutQuart));

            // Old page sliding out to the left slightly
            var slideOut =
                Tween(begin: Offset.zero, end: const Offset(-0.3, 0.0)).animate(
                    CurvedAnimation(
                        parent: secondaryAnimation,
                        curve: Curves.easeInOutQuart));

            return SlideTransition(
              position: slideIn,
              child: SlideTransition(position: slideOut, child: child),
            );
          },
        );
}
