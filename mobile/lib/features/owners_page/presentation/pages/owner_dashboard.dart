import 'package:flutter/material.dart';
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
          SizedBox(
            height: 2,
          ),
          commonDrawerWidget(
              icon: Icons.shopping_cart_outlined,
              text: "Point Of Sales",
              isClicked: false,
              onTap: () {}),
          SizedBox(
            height: 2,
          ),
          commonDrawerWidget(
              icon: Icons.library_books_sharp,
              text: "Daily Report",
              isClicked: false,
              onTap: () {}),
          SizedBox(
            height: 2,
          ),
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
              radius: 20,
              child: Center(
                child: Icon(Icons.language),
              ),
            ),
          ),
          SizedBox(
            width: 15,
          ),
          InkWell(
            onTap: () {},
            child: CircleAvatar(
              backgroundColor: Colors.white,
              radius: 20,
              child: Center(
                child: Icon(Icons.notifications_none_outlined),
              ),
            ),
          ),
          SizedBox(
            width: 15,
          ),
          InkWell(
            onTap: () {},
            child: CircleAvatar(
              backgroundColor: Colors.white,
              radius: 20,
              child: Center(
                child: Text("J"),
              ),
            ),
          ),
          SizedBox(
            width: 20,
          ),
        ],
      ),
      body: Center(
        child: Text("data"),
      ),
    );
  }
}
