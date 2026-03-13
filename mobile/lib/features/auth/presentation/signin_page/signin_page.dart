import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:pos_app/services/api/auth_storage.dart';

import '../../../../config/routes/name.dart';
import '../../../../services/get_current_user.dart';
import '../../../../utils/common_snackbar.dart';
import '../../domain/auth_user.dart';
import '../bloc/auth_bloc.dart';
import '../common_auth_widget.dart';

class SignInPage extends StatefulWidget {
  const SignInPage({super.key});

  @override
  State<SignInPage> createState() => _SignInPageState();
}

class _SignInPageState extends State<SignInPage> {
  final _passwordController = TextEditingController();
  final _usernameController = TextEditingController();

  bool _rememberMe = false;
  final Color _primaryGreen = const Color(0xFF10B981);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: BlocConsumer<AuthBloc, AuthState>(
        listener: (context, state) async {
          if (state is AuthFailureState) {
            commonSnackBar(
                context, state.errMsg, Colors.white, Colors.red.shade200);
          }
          if (state is AuthSuccessState) {
            await context.read<UserProvider>().ensureUserLoaded();
            Navigator.pushNamedAndRemoveUntil(
                context, NamedRoutes.RoleDashboardPage, (predicate) => false);
          }
          return;
        },
        builder: (context, state) {
          return Stack(
            fit: StackFit.expand,
            children: [
              SingleChildScrollView(
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    const SizedBox(height: 40),

                    // --- Logo ---
                    Container(
                      height: 100,
                      width: 100,
                      decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          image: DecorationImage(
                              image: AssetImage("assets/logos/pos.png"))),
                    ),
                    const SizedBox(height: 16),
                    const Text("Kiya Smart POS. Easy Living.",
                        style: TextStyle(fontSize: 14, color: Colors.grey)),
                    const SizedBox(height: 40),

                    // --- Header Text ---
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: Text("Sign in to continue your journey",
                          style: TextStyle(fontSize: 14, color: Colors.grey)),
                    ),
                    const SizedBox(height: 20),

                    const SizedBox(height: 24),

                    // --- Inputs ---
                    UniTextField(
                      label: "username",
                      hint: "e.g jonn....",
                      prefixIcon: Icons.person,
                      keyboardType: TextInputType.text,
                      controller: _usernameController,
                    ),
                    const SizedBox(height: 16),
                    UniTextField(
                      label: "Password",
                      hint: "Enter your password",
                      prefixIcon: Icons.lock_outline,
                      isPassword: true,
                      controller: _passwordController,
                    ),
                    const SizedBox(height: 16),

                    // --- Actions (Remember Me / Forgot Password) ---
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            SizedBox(
                              height: 24,
                              width: 24,
                              child: Checkbox(
                                activeColor: _primaryGreen,
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(4)),
                                value: _rememberMe,
                                onChanged: (v) =>
                                    setState(() => _rememberMe = v!),
                              ),
                            ),
                            const SizedBox(width: 8),
                            const Text("Remember me",
                                style: TextStyle(
                                    color: Colors.grey, fontSize: 13)),
                          ],
                        ),
                        GestureDetector(
                          onTap: () {},
                          child: Text("Forgot password?",
                              style: TextStyle(
                                  color: _primaryGreen,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // --- Sign In Button ---
                    BouncingButton(
                      onTap: () {
                        if (_usernameController.text.isEmpty ||
                            _passwordController.text.isEmpty) {
                          print("....on login ui page....");
                          commonSnackBar(context, "Required input are empty.",
                              Colors.white, Colors.red.shade300);
                          return;
                        }
                        context.read<AuthBloc>().add(
                              SigninClickedEvent(
                                username: _usernameController.text,
                                password: _passwordController.text,
                              ),
                            );
                      },
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        decoration: BoxDecoration(
                          color: _primaryGreen,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                                color: _primaryGreen.withOpacity(0.3),
                                blurRadius: 10,
                                offset: const Offset(0, 4))
                          ],
                        ),
                        child: const Center(
                          child: Text("Sign In",
                              style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ),
                    const SizedBox(height: 30),

                    // Register your mart button (directly under Sign In)
                    Align(
                      alignment: Alignment.center,
                      child: TextButton(
                        onPressed: () {
                          Navigator.pushNamed(
                              context, NamedRoutes.RegisterMartPage);
                        },
                        child: const Text('Register your mart',
                            style: TextStyle(
                                fontSize: 14, fontWeight: FontWeight.bold)),
                      ),
                    ),

                    // --- Biometric Icon ---
                    BouncingButton(
                      onTap: () {},
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.grey.shade300),
                        ),
                        child: Icon(Icons.fingerprint,
                            size: 32, color: _primaryGreen),
                      ),
                    ),

                    // Logout shortcut (useful during testing)
                    Align(
                      alignment: Alignment.center,
                      child: TextButton(
                        onPressed: () {
                          context.read<AuthBloc>().add(LogoutRequested());
                        },
                        child: const Text('Logout',
                            style: TextStyle(fontSize: 12)),
                      ),
                    ),
                    const SizedBox(height: 30),
                    const SizedBox(height: 30),
                    const Divider(color: Colors.grey),
                    const SizedBox(height: 20),
                    const Text("By continuing, you agree to Kiya Smart POS",
                        style: TextStyle(fontSize: 12, color: Colors.grey)),
                    const SizedBox(height: 4),
                    GestureDetector(
                      onTap: () {},
                      child: const Text("Terms of Service",
                          style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey,
                              decoration: TextDecoration.underline)),
                    ),
                    const Text("and",
                        style: TextStyle(fontSize: 12, color: Colors.grey)),
                    GestureDetector(
                      onTap: () {},
                      child: const Text("Privacy Policy",
                          style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey,
                              decoration: TextDecoration.underline)),
                    ),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
              state is AuthLoadingState
                  ? Center(
                      child: Container(
                          height: 50,
                          width: 50,
                          padding: EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.black,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: CircularProgressIndicator(
                            color: Colors.white,
                          )),
                    )
                  : SizedBox(),
              // Sticky Overlay (If you want the background shapes from previous page)
              // Positioned.fill(child: IgnorePointer(child: OverlayContainerToScreen(context: context))),
            ],
          );
        },
      ),
    );
  }
}
