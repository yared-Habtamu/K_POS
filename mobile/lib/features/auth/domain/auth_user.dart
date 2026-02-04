class AuthUser {
  final String? id;
  final String username;
  final String? name;
  final String? martId;
  final String? email;
  final String? phone;
  final String role;
  final String token;

  const AuthUser({
    this.id,
    required this.username,
    this.name,
    this.martId,
    this.email,
    this.phone,
    required this.role,
    required this.token,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'username': username,
        'name': name,
        'martId': martId,
        'email': email,
        'phone': phone,
        'role': role,
        'token': token,
      };

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: (json['id'] ?? json['_id'])?.toString(),
      username: (json['username'] ?? '').toString(),
      name: json['name']?.toString(),
      martId: (json['martId'] ?? json['shopId'] ?? json['mart'])?.toString(),
      email: json['email']?.toString(),
      phone: json['phone']?.toString(),
      role: (json['role'] ?? '').toString(),
      token: (json['token'] ?? '').toString(),
    );
  }
}
