class AuthUser {
  final String? id;
  final String username;
  final String? name;
  final String? martId;
  final String? email;
  final String? phone;
  final String role;
  final String token;
  final List<String> permissions;

  const AuthUser({
    this.id,
    required this.username,
    this.name,
    this.martId,
    this.email,
    this.phone,
    required this.role,
    required this.token,
    this.permissions = const [],
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
        'permissions': permissions,
      };

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    final permsRaw = json['permissions'];
    final perms = <String>[];
    if (permsRaw is List) {
      for (final p in permsRaw) {
        try {
          perms.add(p.toString());
        } catch (_) {}
      }
    }

    return AuthUser(
      id: (json['id'] ?? json['_id'])?.toString(),
      username: (json['username'] ?? '').toString(),
      name: json['name']?.toString(),
      martId: (json['martId'] ?? json['shopId'] ?? json['mart'])?.toString(),
      email: json['email']?.toString(),
      phone: json['phone']?.toString(),
      role: (json['role'] ?? '').toString(),
      token: (json['token'] ?? '').toString(),
      permissions: perms,
    );
  }

  AuthUser copyWith({
    String? id,
    String? username,
    String? name,
    String? martId,
    String? email,
    String? phone,
    String? role,
    String? token,
    List<String>? permissions,
  }) {
    return AuthUser(
      id: id ?? this.id,
      username: username ?? this.username,
      name: name ?? this.name,
      martId: martId ?? this.martId,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      role: role ?? this.role,
      token: token ?? this.token,
      permissions: permissions ?? this.permissions,
    );
  }
}
