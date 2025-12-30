import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:pos_app/config/routes/name.dart';
import '../../../../services/get_current_user.dart';

import '../bloc/home_bloc.dart';
import '../widget/home_widget.dart';

class HomePage extends StatefulWidget {
  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  @override
  void initState() {
    super.initState();
    UserProvider().initUser();
    // context.read<HomeBloc>().add(FetchUserSchedulesEvent());
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<UserProvider>().user;
    print("...............................user - > $user");
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: BlocConsumer<HomeBloc, HomeState>(
          listener: (context, state) {
            if (state is HomeFailureState) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(state.msgFailure ?? "An error occurred"),
                  backgroundColor: Colors.red,
                  behavior: SnackBarBehavior.floating,
                ),
              );
            }
          },
          builder: (context, state) {
            return ListView(
              padding: const EdgeInsets.all(20),
              children: [
                _buildHeader("jonn"),
                const SizedBox(height: 10),
                _buildDateSelector(),
                const SizedBox(height: 10),
                const SizedBox(height: 20),
                const SizedBox(height: 30),
              ],
            );
          },
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {},
        backgroundColor: Colors.blue,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  Widget _buildHeader(String username) {
    return Row(
      children: [
        Text("Hey, ${username}!",
            style: TextStyle(fontSize: 16, color: Colors.grey.shade900)),
        const Spacer(),
        IconButton(
          icon: const Icon(Icons.notifications_none),
          onPressed: () {},
        ),
        const SizedBox(width: 10),
        PopupMenuButton<String>(
          icon: const Icon(Icons.more_vert),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
          onSelected: (value) {
            if (value == 'logout') {
              showLogoutDialog(context);
            }
          },
          itemBuilder: (BuildContext context) => [
            const PopupMenuItem<String>(
              value: 'settings',
              child: Row(
                children: [
                  Icon(Icons.settings, size: 20, color: Colors.black),
                  SizedBox(width: 10),
                  Text("Settings"),
                ],
              ),
            ),
            const PopupMenuItem<String>(
              value: 'logout',
              child: Row(
                children: [
                  Icon(Icons.logout, size: 20, color: Colors.red),
                  SizedBox(width: 10),
                  Text("Logout", style: TextStyle(color: Colors.red)),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildDateSelector() {
    return Row(
      children: [
        const Text("Wednesday",
            style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold)),
        Icon(Icons.keyboard_arrow_down, size: 32, color: Colors.grey.shade700),
      ],
    );
  }
}
