class UserM {
  String username;
  String phone;
  String password;
  String? profilePicture;
  String? uid;
  DateTime createdAt;

  UserM({
    required this.username,
    required this.phone,
    required this.password,
    this.profilePicture,
    required this.uid,
    required this.createdAt,
  });

  factory UserM.fromJson(Map<String, dynamic> json) {
    return UserM(
      username: json['name'],
      phone: json['phone'],
      profilePicture: json['profile_picture'],
      uid: json['id'],
      createdAt: DateTime.parse(json['created_at']),
      password: json['password'],
    );
  }

  factory UserM.fromMap(Map<String, dynamic> map) {
    return UserM(
      username: map['username'],
      password: map['password'],
      phone: map['phone'],
      profilePicture: map['profile_picture'],
      uid: map['id'],
      createdAt: DateTime.parse(map['created_at']),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'username': username,
      'phone': phone,
      'password': password,
      'profile_picture': profilePicture,
      'id': uid,
      'created_at': createdAt.toIso8601String(),
    };
  }
}
