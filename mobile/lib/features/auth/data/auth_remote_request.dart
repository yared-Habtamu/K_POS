import '../domain/user_model.dart';

class AuthService {
  // Mock Database
  static final List<UserM> _mockUsers = [
    UserM(
        username: "jon",
        phone: "90990999",
        password: '112233',
    role: 'cashier',
        uid: 'uid',
    createdAt: DateTime.now()),
  UserM(
    username: "owner",
    phone: "90000001",
    password: '112233',
    role: 'owner',
    uid: 'uid_owner',
    createdAt: DateTime.now()),
  UserM(
    username: "manager",
    phone: "90000002",
    password: '112233',
    role: 'manager',
    uid: 'uid_manager',
    createdAt: DateTime.now()),
  UserM(
    username: "store",
    phone: "90000003",
    password: '112233',
    role: 'store_keeper',
    uid: 'uid_store',
    createdAt: DateTime.now()),
  UserM(
    username: "admin",
    phone: "90000004",
    password: '112233',
    role: 'system_admin',
    uid: 'uid_admin',
    createdAt: DateTime.now()),
  ];

  Future<UserM?> signIn({
    required String username,
    required String password,
  }) async {
    try {
      await Future.delayed(const Duration(seconds: 1));

      final user = _mockUsers.firstWhere(
        (u) => u.username == username,
        orElse: () => throw Exception('user-not-found'),
      );

      if (user.password != password) {
        throw Exception('wrong-password');
      }

      return user;
    } on Exception catch (e) {
      throw _handleAuthException(e);
    }
  }

  Future<UserM?> getUserData(String uid) async {
    try {
      await Future.delayed(const Duration(milliseconds: 500));

      return _mockUsers.firstWhere((user) => user.uid == uid);
    } catch (e) {
      return null;
    }
  }

  Future<void> signOut() async {
    await Future.delayed(const Duration(milliseconds: 500));
  }

  String _handleAuthException(Exception e) {
    final errorString = e.toString();

    if (errorString.contains('email-already-in-use')) {
      return 'An account already exists for this phone number.';
    } else if (errorString.contains('user-not-found')) {
      return 'No user found for this phone number.';
    } else if (errorString.contains('wrong-password')) {
      return 'Wrong password provided.';
    }

    return 'An authentication error occurred. Please try again.';
  }
}
