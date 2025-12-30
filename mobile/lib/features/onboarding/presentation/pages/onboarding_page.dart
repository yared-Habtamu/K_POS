import 'package:flutter/material.dart';
import 'package:liquid_swipe/liquid_swipe.dart';
import 'package:video_player/video_player.dart';

import 'onboarding_widget.dart';

class OnboardingScreen1 extends StatefulWidget {
  const OnboardingScreen1({super.key});

  @override
  State<OnboardingScreen1> createState() => _OnboardingScreen1State();
}

class _OnboardingScreen1State extends State<OnboardingScreen1> {
  late VideoPlayerController _controller;
  late VideoPlayerController _controller2;

  @override
  void initState() {
    super.initState();
    startShowing();
  }

  startShowing()async{
    _controller = VideoPlayerController.asset("assets/pos1.mp4")
      ..initialize().then((_) {
        _controller.setLooping(true);
        _controller.play();
        setState(() {});
      });
    _controller2 = VideoPlayerController.asset("assets/pos1.mp4")
      ..initialize().then((_) {
        _controller2.setLooping(true);
        _controller2.play();
        setState(() {});
      });
  }
  @override
  Widget build(BuildContext context) {
    List<Widget> pages = [
      onBoardingTwoPageReusableContainer(
        context: context,
        backColor: Colors.white,
        imagePath: "assets/images/medi_connection.png",
        // Image of phone + device
        title1: "Smart POS System",
        title2: "",
        subTitle:
            "Complete point-of-sale and inventory management solution for Ethiopian supermarkets and retail stores.",
        controller: _controller,
      ),

      // PAGE 2: AUTOMATED DISPENSING & SAFETY
      onBoardingTwoPageReusableContainer(
        context: context,
        backColor: const Color(0xFFE0F2F1),
        // Soft Medical Mint
        imagePath: "assets/images/medi_safety.png",
        // Image showing pill tray
        title1: "Automated &",
        title2: "Safety-First Care",
        subTitle: "Everything you need to run your business.",
        controller: _controller2,
      ),
      onBoardingThirdPageReusableContainer(
        context: context,
      ),
    ];

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: LiquidSwipe(
        pages: pages,
        enableLoop: false,
        enableSideReveal: true,
        fullTransitionValue: 300,
        slideIconWidget:
            Icon(Icons.arrow_back_ios, color: Colors.black, size: 20),
        onPageChangeCallback: (value) {
          startShowing();
          print("...on slide : - >  $value");
        },
      ),
    );
  }
}
