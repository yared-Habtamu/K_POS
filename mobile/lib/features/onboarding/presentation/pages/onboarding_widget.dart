import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import '../../../../config/routes/name.dart';
import '../../../../services/global.dart';

Widget OverlayContainerToScreen({required BuildContext context}) {
  return Container(
    height: MediaQuery.of(context).size.height,
    width: MediaQuery.of(context).size.width,
    child: Stack(
      children: [
        Positioned(
          left: 0,
          top: 20,
          child: RotatedBox(
            quarterTurns: 1,
            child: Container(
              height: 50,
              width: 100,
              decoration: BoxDecoration(
                color: Colors.green.shade100.withOpacity(0.5),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(100),
                  topRight: Radius.circular(100),
                ),
              ),
            ),
          ),
        ),
        Positioned(
          top: MediaQuery.of(context).size.height * 0.6,
          right: 0,
          child: RotatedBox(
            quarterTurns: 3,
            child: Container(
              height: 50,
              width: 100,
              decoration: BoxDecoration(
                color: Colors.green.shade100.withOpacity(0.5),
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(100),
                  topRight: Radius.circular(100),
                ),
              ),
            ),
          ),
        ),
        Positioned(
          top: MediaQuery.of(context).size.height * 0.9,
          left: MediaQuery.of(context).size.width * 0.4,
          child: CircleAvatar(
            backgroundColor: Colors.green.shade100.withOpacity(0.5),
            radius: 20,
          ),
        ),
      ],
    ),
  );
}

Widget onBoardingTwoPageReusableContainer({
  required BuildContext context,
  required String? title1,
  String? title2,
  required String subTitle,
  required String imagePath,
  required Color
      backColor, // Ensure this has some transparency if you want to see the video clearly
  required VideoPlayerController controller,
}) {
  return Stack(
    children: [
      // 1. Background Video Layer
      controller.value.isInitialized
          ? SizedBox.expand(
              child: FittedBox(
                fit: BoxFit.cover, // Ensures video fills the whole screen
                child: SizedBox(
                  width: controller.value.size.width,
                  height: controller.value.size.height,
                  child: VideoPlayer(controller),
                ),
              ),
            )
          : Container(color: backColor), // Fallback color while loading

      // 2. Overlay Tint (Optional: to make text readable over video)
      Container(
        decoration: BoxDecoration(
          // Using a gradient or semi-transparent color so video is visible
          color: backColor.withOpacity(0.3),
        ),
      ),

      // 3. Content Layer
      SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 10),
          child: Column(
            children: [
              // Skip Button Row
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () async {
                      // Note: setDeviceOpenedFirst(true) usually means "Yes, they've seen it"
                      await Global.storageServices.setDeviceOpenedFirst(true);
                      Navigator.pushNamedAndRemoveUntil(context,
                          NamedRoutes.SigninPage, (predicate) => false);
                    },
                    child: Text(
                      "Skip",
                      style: TextStyle(
                        fontSize: 16,
                        color: Colors.white, // Ensure visibility over video
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const Spacer(),
              // Title Section
              RichText(
                textAlign: TextAlign.center,
                text: TextSpan(
                  children: [
                    TextSpan(
                      text: "${title1}\n",
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 30,
                        fontWeight: FontWeight.bold,
                        shadows: [
                          Shadow(blurRadius: 10, color: Colors.black45)
                        ],
                      ),
                    ),
                    if (title2 != null)
                      TextSpan(
                        text: title2,
                        style: TextStyle(
                          color: Colors.greenAccent.shade400,
                          fontSize: 32,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Subtitle
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Text(
                  subTitle,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 18,
                    color: Colors.white70,
                    height: 1.4,
                  ),
                ),
              ),
              const Spacer(flex: 2),
            ],
          ),
        ),
      ),

      // Keep your custom overlay if necessary
      OverlayContainerToScreen(context: context),
    ],
  );
}

Widget onBoardingThirdPageReusableContainer({
  required BuildContext context,
}) {
  return SingleChildScrollView(
    child: Container(
      padding: EdgeInsets.symmetric(vertical: 20, horizontal: 10),
      decoration: BoxDecoration(
        color: Colors.green.shade50,
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              InkWell(
                onTap: () {},
                child: Padding(
                  padding: const EdgeInsets.all(10),
                  child: Text(
                    "Skip",
                    style: TextStyle(
                      fontSize: 16,
                    ),
                  ),
                ),
              ),
            ],
          ),
          Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(100),
              color: Colors.greenAccent.shade100.withOpacity(0.5),
            ),
            padding: EdgeInsets.all(40),
            margin: EdgeInsets.all(20),
            child: Column(
              children: [
                CircleAvatar(
                  backgroundColor: Colors.greenAccent.shade400,
                  radius: 30,
                  child: Center(child: Icon(Icons.emoji_events_outlined)),
                ),
                reusableHighlightContainer(
                  icon: Icons.point_of_sale,
                  title: "POS System",
                ),
                reusableHighlightContainer(
                    icon: Icons.inventory, title: "Inventory"),
                reusableHighlightContainer(
                    icon: Icons.groups, title: "Multi-Role"),
              ],
            ),
          ),
          SizedBox(
            height: 50,
          ),
          Padding(
            padding: const EdgeInsets.all(15),
            child: Text(
              "Fast checkout with barcode scanning,Real-time stock management,5 user roles with permissions,Sales and financial analytics",
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 18, color: Colors.grey.shade700),
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(top: 15,left: 15,right: 15,bottom: 5),
            child: InkWell(
              onTap: () async {
                print("....on click get start - >  ");
                // Navigator.pushNamedAndRemoveUntil(
                //     context, NamedRoutes.SignupPage, (predicate) => false);
                // await Global.storageServices.setDeviceOpenedFirst(false);
              },
              child: Container(
                height: 60,
                width: double.maxFinite,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(15),
                  color: Colors.greenAccent.shade700,
                ),
                child: Center(
                  child: Text(
                    "Get Started",
                    style: TextStyle(
                        fontSize: 20,
                        color: Colors.white,
                        fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(top: 5,left: 15,right: 15,bottom: 5),
            child: InkWell(
              onTap: () async {
                print("....on click register mart - >  ");
                // Navigator.pushNamedAndRemoveUntil(
                //     context, NamedRoutes.SignupPage, (predicate) => false);
                // await Global.storageServices.setDeviceOpenedFirst(false);
              },
              child: Container(
                height: 60,
                width: double.maxFinite,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(15),
                  // color: Colors.greenAccent.shade700,
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: Center(
                  child: Text(
                    "Register Your Mart",
                    style: TextStyle(
                        fontSize: 20,
                        color: Colors.black,
                        fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(top: 5,left: 15,right: 15,bottom: 5),
            child: InkWell(
              onTap: () async {
                print("....on click login - >  ");
                Navigator.pushNamedAndRemoveUntil(
                    context, NamedRoutes.SigninPage, (predicate) => false);
                await Global.storageServices.setDeviceOpenedFirst(false);
              },
              child: Container(
                height: 60,
                width: double.maxFinite,
                decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(15),
                    // color: Colors.greenAccent.shade700,
                    border: Border.all(color: Colors.grey.shade300)),
                child: Center(
                  child: Text(
                    "Login",
                    style: TextStyle(
                        fontSize: 20,
                        color: Colors.black,
                        fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

Widget reusableHighlightContainer({
  required IconData icon,
  required String title,
}) {
  return Container(
    height: 50,
    margin: EdgeInsets.all(10),
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(5),
      color: Colors.blueGrey.shade700,
    ),
    child: Padding(
      padding: const EdgeInsets.only(left: 10, right: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(5),
                  color: Colors.greenAccent,
                ),
                padding: EdgeInsets.all(5),
                margin: EdgeInsets.all(8),
                child: Center(
                    child: Icon(
                  icon,
                  size: 20,
                  color: Colors.white,
                )),
              ),
              Text(
                "$title",
                style: TextStyle(color: Colors.white),
              ),
            ],
          ),
          Icon(
            Icons.check_circle_outline,
            color: Colors.greenAccent,
          ),
        ],
      ),
    ),
  );
}
