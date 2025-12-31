import 'package:flutter/material.dart';

Widget CommonDrawer({
  required BuildContext context,
  required List<Widget> drawerItems,
  String roleLabel = 'cashier',
}) {
  return Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Drawer(
        semanticLabel: "Drawer",
        child: ListView(
          children: [
            Row(
              children: [
                Container(
                  padding: EdgeInsets.all(10),
                  margin: EdgeInsets.all(10),
                  decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(10),
                      color: Colors.blue.shade900),
                  child: Image.asset(
                    "assets/logos/pos.png",
                    height: 40,
                    width: 40,
                    fit: BoxFit.fill,
                  ),
                ),
                Column(
                  mainAxisAlignment: MainAxisAlignment.start,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "Smart POS",
                      style: TextStyle(
                          // color: isClicked ? Colors.white : Colors.black,
                          ),
                    ),
                    Text(
                      roleLabel,
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            SizedBox(
              height: 30,
            ),
            ListView.builder(
              scrollDirection: Axis.vertical,
              shrinkWrap:true,
              itemCount: drawerItems.length,
                itemBuilder: (context,index){
                return drawerItems[index];
                },),
          ],
        ),
      ),
      Container(
        height: 60,
        width: 60,
        child: IconButton(
          onPressed: () {
            Navigator.pop(context);
          },
          icon: Icon(
            Icons.cancel_presentation,
            color: Colors.white,
          ),
        ),
      ),
    ],
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
      padding: EdgeInsets.all(10),
      margin: EdgeInsets.only(left: 15, right: 15),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(5),
        color: isClicked ? Colors.green : Colors.white,
      ),
      child: Row(
        children: [
          Icon(
            icon,
            color: isClicked ? Colors.white : Colors.black,
          ),
          SizedBox(
            width: 20,
          ),
          Text(
            text,
            style: TextStyle(
              color: isClicked ? Colors.white : Colors.black,
            ),
          ),
        ],
      ),
    ),
  );
}
