import 'package:awesome_notifications/awesome_notifications.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'package:get/get_navigation/src/root/get_material_app.dart';
import 'package:pos_app/features/owners_page/presentation/bloc/owner_bloc.dart';
import 'package:pos_app/services/get_current_user.dart';
import 'package:pos_app/services/global.dart';
import 'package:provider/provider.dart';
import 'config/routes/name.dart';
import 'config/routes/pages.dart';
import 'config/theme/theme_mode_provider.dart';
import 'features/auth/presentation/bloc/auth_bloc.dart';
import 'init_dependencies.dart';

void main() async {
  await Global.init();
  await initDependencies();
  AwesomeNotifications().initialize(
      // set the icon to null if you want to use the default app icon
      'resource://drawable/res_meditrack_notifications_icon',
      [
        NotificationChannel(
            channelGroupKey: 'basic_channel_group',
            channelKey: 'basic_channel',
            channelName: 'Basic notifications',
            channelDescription: 'Notification channel for basic tests',
            defaultColor: Color(0xFF9D50DD),
            ledColor: Colors.white),
        NotificationChannel(
            channelGroupKey: 'basic_channel_group',
            channelKey: 'schedule_channel',
            channelName: 'Basic notifications',
            channelDescription: 'Notification channel for basic tests',
            defaultColor: Color(0xFF9D50DD),
            ledColor: Colors.white)
      ],
      // Channel groups are only visual and are not required
      channelGroups: [
        NotificationChannelGroup(
            channelGroupKey: 'basic_channel_group',
            channelGroupName: 'Basic group')
      ],
      debug: true);
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeManager()),
        ChangeNotifierProvider(create: (_) => UserProvider()),
      ],
      child: MultiBlocProvider(
        providers: [
          BlocProvider(create: (create) => serviceLocator<AuthBloc>()),
          BlocProvider(create: (create) => serviceLocator<OwnerBloc>()),
        ],
        child: Consumer<ThemeManager>(
          builder: (context, themeManager, child) {
            return GetMaterialApp(
              title: 'Simple Pos',
              debugShowCheckedModeBanner: false,
              themeMode: themeManager.themeMode,
              theme: ThemeData.light(),
              darkTheme: ThemeData.dark(),
              onGenerateRoute: NamedRouteSettings.GenerateRouteSettings,
              initialRoute: NamedRoutes.SplashScreenPage,
              // getPages: AppPages.routes,
            );
          },
        ),
      ),
    );
  }
}
