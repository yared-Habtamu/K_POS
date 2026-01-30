import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:pos_app/features/common_dashboard_pages/common_drawer_and_header.dart';

class OwnerDashboard extends StatefulWidget {
  const OwnerDashboard({super.key});

  @override
  State<OwnerDashboard> createState() => _OwnerDashboardState();
}

class _OwnerDashboardState extends State<OwnerDashboard> {
  final GlobalKey<ScaffoldState> _drawerKey = GlobalKey<ScaffoldState>();
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _drawerKey,
      drawer: CommonDrawer(
        context: context,
        drawerItems: [
          commonDrawerWidget(
              icon: Icons.dashboard,
              text: "Dashboard",
              isClicked: true,
              onTap: () {
                Navigator.pop(context);
              }),
          commonDrawerWidget(
              icon: Icons.shopping_cart_outlined,
              text: "Point Of Sales",
              isClicked: false,
              onTap: () {}),
          commonDrawerWidget(
              icon: Icons.library_books_sharp,
              text: "Daily Report",
              isClicked: false,
              onTap: () {}),
          commonDrawerWidget(
              icon: Icons.groups,
              text: "Customers",
              isClicked: false,
              onTap: () {}),
        ],
      ),
      appBar: AppBar(
        leading: IconButton(
          onPressed: () {
            _drawerKey.currentState?.openDrawer();
          },
          icon: Image.asset("assets/icons/hamburger.png"),
        ),
        actions: [
          InkWell(
            onTap: () {},
            child: CircleAvatar(
              backgroundColor: Colors.white,
              radius: 20.0.r,
              child: Center(
                child: Icon(Icons.language, size: 20.0.sp),
              ),
            ),
          ),
          SizedBox(width: 15.0.w),
          InkWell(
            onTap: () {},
            child: CircleAvatar(
              backgroundColor: Colors.white,
              radius: 20.0.r,
              child: Center(
                child: Icon(Icons.notifications_none_outlined, size: 20.0.sp),
              ),
            ),
          ),
          SizedBox(width: 15.0.w),
          InkWell(
            onTap: () {},
            child: CircleAvatar(
              backgroundColor: Colors.white,
              radius: 20.0.r,
              child: Center(
                child: Text("J", style: TextStyle(fontSize: 16.0.sp)),
              ),
            ),
          ),
          SizedBox(width: 20.0.w),
        ],
      ),
      body: Center(
        child: Text("data"),
      ),
    );
  }
}
