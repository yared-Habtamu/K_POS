// import 'dart:convert';
//
// import 'package:awesome_notifications/awesome_notifications.dart';
// import 'package:flutter/material.dart';
// import 'package:flutter_bloc/flutter_bloc.dart';
// import 'package:flutter_localizations/flutter_localizations.dart';
// import 'package:flutter_screenutil/flutter_screenutil.dart';
// import 'package:get/get.dart';
// import 'package:get/get_navigation/src/root/get_material_app.dart';
// import 'package:provider/provider.dart';
// import 'package:shared_preferences/shared_preferences.dart';
// import 'package:tlefli_new_app_design/auth/API/api_services.dart';
// import 'package:tlefli_new_app_design/common/route_handler/pages.dart';
// import 'package:tlefli_new_app_design/l10n/app_localizations.dart';
// import 'package:tlefli_new_app_design/l10n/l10n.dart';
// import 'package:tlefli_new_app_design/models/user_data_model.dart';
// import 'package:tlefli_new_app_design/services/constants.dart';
// import 'package:tlefli_new_app_design/services/global.dart';
// import 'package:tlefli_new_app_design/services/providers/local_provider.dart';
// import 'package:tlefli_new_app_design/user_pages/NotificationPage/awsome_notifications.dart';
// import 'package:tlefli_new_app_design/user_pages/NotificationPage/notification%20sent/notification_sent_object.dart';
// import 'package:tlefli_new_app_design/utils/AppColorCollections.dart';
// import 'package:workmanager/workmanager.dart';
//
// const String findMatchTask = "find_match_task";
//
// // Background task callback
// @pragma('vm:entry-point')
// void callbackDispatcher() async {
//   WidgetsFlutterBinding.ensureInitialized();
//   Workmanager().executeTask((task, userInfo) async {
//     print("....Workmanager task started: $task.....");
//     SharedPreferences prefs1 = await SharedPreferences.getInstance();
//     final userData = await prefs1.get(AppConstants.USER_DATA);
//     if (task == findMatchTask) {
//       print("....Running scheduled task: find_match_task...");
//       if (userData != null) {
//         final decodedData = jsonDecode(userData as String);
//         print("...User data from callback dispatcher: $decodedData...");
//         await ItemMatch(UserData.fromJson(decodedData));
//       } else {
//         print("...User data is null...");
//       }
//     } else {
//       print("Unknown task: $task");
//     }
//     return Future.value(true); // Signal that the task is complete
//   });
// }
//
// Future<void> ItemMatch(UserData? userData) async {
//   print("...Starting ItemMatch function...");
//
//   if (userData == null) {
//     print("...UserData is null in ItemMath Function...");
//     return;
//   }
//
//   print("...Before calling GetLostOrFoundItemsForUser API...");
//   try {
//     // Step 1: Fetch user's lost/found items
//     Map<String, dynamic>? data = await ApiService()
//         .GetLostOrFoundItemsForUser(userData, userData.token['refreshToken']);
//     print("...After calling GetLostOrFoundItemsForUser API...");
//     print("...user lost items are : ${data}...");
//     if (data == null) {
//       print("...API returned null data...");
//       return;
//     }
//
//     // Step 2: Extract item IDs
//     List<String> itemIds = [];
//     for (int i = 0; i < data["items"].length; i++) {
//       if (!itemIds.contains(data["items"][i]['_id'])) {
//         print("...Saving item ID: ${data["items"][i]['_id']}...");
//         itemIds.add(data["items"][i]['_id']);
//       }
//     }
//     print("...User items IDs: $itemIds...");
//
//     // Step 3: Fetch matches for the item IDs
//     print("Calling getUserMatch API");
//     List<Map<String, dynamic>> userMatch =
//         await ApiService().getUserMatch(userData, itemIds);
//
//     // Step 4: Process matches and create notifications
//     List<NotificationsSentObject> notifications = [];
//     if (userMatch.isNotEmpty) {
//       print("...User match data is not empty...");
//
//       // Loop through each match
//       for (int i = 0; i < userMatch.length; i++) {
//         // List<dynamic> matchData = userMatch[i]["matchData"];
//         print("...Processing match data for item ${i + 1}...");
//         print("...length of user match is : ${userMatch.length}...");
//         print("...user match is :   ${userMatch}....");
//         // Loop through each item in matchData
//         for (int j = 0; j < userMatch[i]["matchData"].length; j++) {
//           print(".....matchData.length :  ${userMatch[i]["matchData"].length}");
//           Map<String, dynamic> item = userMatch[i]["matchData"][j]["item"];
//           print("Adding notification for item: ${item["_id"]}");
//
//           // Create a NotificationsSentObject from the item
//           notifications.add(NotificationsSentObject.fromJson(item));
//         }
//       }
//     }
//
//     // Step 5: Create notifications if the list is not empty
//     if (notifications.isEmpty) {
//       print("Notification list is empty");
//     } else {
//       print("Notification list is not empty");
//       for (int i = 0; i < notifications.length; i++) {
//         if (!notifications[i].isSent!) {
//           print("Creating notification for item: ${notifications[i]}");
//           createNotification(notifications[i]);
//           notifications[i].isSent = true;
//         }
//       }
//     }
//   } catch (e) {
//     print("Error in ItemMatch: $e");
//   }
// }
//
// void main() async {
//   await Global.init();
//   AwesomeNotifications().initialize(
//     "resource://drawable/res_tlefli_notifications_icon",
//     [
//       NotificationChannel(
//         channelKey: 'Basic_channel',
//         channelName: 'Basic Notification',
//         defaultColor: ColorCollections.TeritiaryColor,
//         importance: NotificationImportance.High,
//         channelShowBadge: true,
//         playSound: true,
//         // soundSource: "resource://raw/res_custom_notification",
//         channelDescription:
//             "Basic notification enables the notification for Basic event like when item matched exists.",
//       ),
//       NotificationChannel(
//         channelKey: 'schedule_channel',
//         channelName: 'Schedule Notification',
//         defaultColor: ColorCollections.QuaterneryColor,
//         importance: NotificationImportance.High,
//         channelShowBadge: true,
//         locked: true,
//         channelDescription:
//             "Schedule notification enables the notification for scheduled event like user not respond to the item matched.",
//       ),
//     ],
//   );
//   runApp(MyApp());
// }
//
// class MyApp extends StatelessWidget {
//   const MyApp({Key? key}) : super(key: key);
//
//   @override
//   Widget build(BuildContext context) {
//     return MultiBlocProvider(
//       providers: [...NamedRouteSettings.allBlocProviders(context)],
//       child: ScreenUtilInit(
//         child: ChangeNotifierProvider(
//           create: (context) => LocaleProvider(),
//           builder: (context, child) {
//             final provider = Provider.of<LocaleProvider>(context);
//             return RebuildApp(
//               key: UniqueKey(),
//               locale: provider.locale,
//             );
//           },
//         ),
//       ),
//     );
//   }
// }
//
// class RebuildApp extends StatefulWidget {
//   final Locale locale;
//
//   const RebuildApp({Key? key, required this.locale}) : super(key: key);
//
//   @override
//   _RebuildAppState createState() => _RebuildAppState();
// }
//
// class _RebuildAppState extends State<RebuildApp> {
//   @override
//   Widget build(BuildContext context) {
//     return GetMaterialApp(
//       theme: ThemeData(
//         colorScheme: ColorScheme.light(
//           primary: ColorCollections.TeritiaryColor,
//           onPrimary: Colors.white,
//           secondary: ColorCollections.TeritiaryColor,
//           onSecondary: Colors.white,
//         ),
//       ),
//       onGenerateRoute: NamedRouteSettings.GenerateRouteSettings,
//       debugShowCheckedModeBanner: false,
//       title: 'TLEFLI APP',
//       supportedLocales: L10n.all,
//       locale: widget.locale,
//       localizationsDelegates: const [
//         AppLocalizations.delegate,
//         GlobalCupertinoLocalizations.delegate,
//         GlobalWidgetsLocalizations.delegate,
//         GlobalMaterialLocalizations.delegate
//       ],
//     );
//   }
// }
