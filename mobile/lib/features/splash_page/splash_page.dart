import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../config/routes/name.dart';
import '../../services/get_current_user.dart';
import '../../services/global.dart';
import '../auth/presentation/bloc/auth_bloc.dart';

class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage> {
  @override
  void initState() {
    // TODO: implement initState
    super.initState();
    OnLoadingFun();
  }

  OnLoadingFun() async {
    bool isUserNew = await Global.storageServices.getDeviceFirstOpen();
    await Future.delayed(Duration(seconds: 2)).then((_) async {
      print("....on splash screen...");
      if (isUserNew) {
        Navigator.pushNamedAndRemoveUntil(
            context, NamedRoutes.OnboardingPage, (predicate) => false);
        return;
      }

      // trigger secure-storage auth check and navigate based on result
     final userData = await context.read<UserProvider>().ensureUserLoaded();
      if (userData!=null) {
        Navigator.pushNamedAndRemoveUntil(
            context, NamedRoutes.RoleDashboardPage, (predicate) => false);
        return;
      }
      Navigator.pushNamedAndRemoveUntil(
          context, NamedRoutes.OnboardingPage, (predicate) => false);
      return;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: BlocListener<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is AuthAuthenticatedState || state is AuthSuccessState) {
            Navigator.pushNamedAndRemoveUntil(
                context, NamedRoutes.RoleDashboardPage, (predicate) => false);
          }
          if (state is AuthLoggedOutState) {
            Navigator.pushNamedAndRemoveUntil(
                context, NamedRoutes.SigninPage, (predicate) => false);
          }
        },
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              CircleAvatar(
                backgroundColor: Colors.white,
                radius: 80,
                child: Image.asset(
                  "assets/logos/pos.png",
                  fit: BoxFit.fill,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
