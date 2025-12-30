import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:pos_app/common_modules/route_navigation.dart';
import 'package:pos_app/config/routes/name.dart';
import 'package:pos_app/features/home/presentation/bloc/home_bloc.dart';
import '../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../features/auth/presentation/signin_page/signin_page.dart';
import '../../features/home/presentation/pages/home_page.dart';
import '../../features/onboarding/presentation/pages/onboarding_page.dart';
import '../../features/splash_page/splash_page.dart';

class NamedRouteSettings {
  NamedRouteSettings({required BuildContext context});

  static List<pageEntity> allPages() {
    return [
      pageEntity(
        route: NamedRoutes.SplashScreenPage,
        page: const SplashPage(),
        // bloc: BlocProvider(
        //   create: (_) => AuthBloc(userLogin: serviceLocator()),
        // ),
      ),
      pageEntity(
        route: NamedRoutes.OnboardingPage,
        page: const OnboardingScreen1(),
        // bloc: BlocProvider(
        //   // create: (_) => AuthBloc(userLogin: serviceLocator()),
        // ),
      ),
      pageEntity(
        route: NamedRoutes.SigninPage,
        page: const SignInPage(),
        bloc: BlocProvider(create: (_) => AuthBloc()),
      ),
      pageEntity(
        route: NamedRoutes.HomePage,
        page: HomePage(),
        bloc: BlocProvider(
          create: (_) => HomeBloc(),
        ),
      ),
    ];
  }

  static List<dynamic> allBlocProviders(BuildContext context) {
    List<dynamic> blocProviders = <dynamic>[];
    for (var bloc in allPages()) {
      if (bloc.bloc != null) blocProviders.add(bloc.bloc);
    }
    return blocProviders;
  }

  static PageRoute GenerateRouteSettings(RouteSettings settings) {
    if (settings.name != null) {
      print("...goes to : ${settings.name}...");
      var route = allPages().where((element) {
        print("...inner : ${element.route}...");
        return element.route == settings.name;
      });
      print("...selected Page :  ${route}...");
      if (route.isNotEmpty) {
        //check whether or not user is login or not
        return SlideRoute(page: route.first.page, settings: settings);
      }
      print('invalid routes');
    }
    return MaterialPageRoute(
      builder: (_) => const OnboardingScreen1(),
      settings: settings,
    );
  }
}

class pageEntity {
  String route;
  Widget page;
  dynamic bloc;

  pageEntity({required this.route, required this.page, this.bloc});
}
