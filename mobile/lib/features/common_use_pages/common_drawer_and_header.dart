import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

Widget CommonDrawer({
  required BuildContext context,
  required List<Widget> drawerItems,
  String roleLabel = 'cashier',
}) {
  return Drawer(
    semanticLabel: "Drawer",
    child: MediaQuery.removePadding(
      context: context,
      removeTop: true,
      child: Container(
        color: Colors.white,
        child: Column(
          children: [

            // Header with logo and close button
            Padding(
              padding: const EdgeInsets.only(top: 0),
              child: Container(
                padding: EdgeInsets.only(left: 10.w,right: 10.w,top: 30.h,bottom: 10.h),
                decoration: BoxDecoration(
                  color: Colors.blue.shade900,
                  borderRadius: BorderRadius.only(
                    bottomLeft: Radius.circular(10.0.r),
                    bottomRight: Radius.circular(10.0.r),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: EdgeInsets.all(8.0.w),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(8.0.r),
                            color: Colors.white,
                          ),
                          child: Image.asset(
                            "assets/logos/pos.png",
                            height: 32.0.h,
                            width: 32.0.w,
                            fit: BoxFit.fill,
                          ),
                        ),
                        SizedBox(width: 12.0.w),
                        Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "Kiya POS System",
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 18.0.sp,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              roleLabel,
                              style: TextStyle(
                                fontSize: 14.0.sp,
                                color: Colors.white70,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    // Container(color:Colors.blue,
                    //   height: 50,width: 100,
                    // ),

                    IconButton(
                      onPressed: () {
                        Navigator.pop(context);
                      },
                      icon: Icon(
                        Icons.close,
                        color: Colors.white,
                        size: 24.0.sp,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            SizedBox(height: 20.0.h),
            // Drawer items
            Expanded(
              child: ListView(
                padding: EdgeInsets.symmetric(horizontal: 8.0.w),
                children: drawerItems,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

Widget commonDrawerWidget({
  required IconData icon,
  required String text,
  required bool isClicked,
  required VoidCallback onTap,
}) {
  return InkWell(
    onTap: onTap,
    child: Container(
      padding: EdgeInsets.symmetric(horizontal: 16.0.w, vertical: 12.0.h),
      margin: EdgeInsets.symmetric(horizontal: 8.0.w, vertical: 4.0.h),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8.0.r),
        color: isClicked ? Colors.green : Colors.white,
      ),
      child: Row(
        children: [
          Icon(
            icon,
            color: isClicked ? Colors.white : Colors.black,
            size: 24.0.sp,
          ),
          SizedBox(width: 16.0.w),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                color: isClicked ? Colors.white : Colors.black,
                fontSize: 16.0.sp,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    ),
  );
}
