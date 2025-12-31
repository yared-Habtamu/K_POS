class AdminShop {
  final String id;
  final String name;
  final String owner;
  final AdminShopStatus status;
  final int users;
  final int sales;
  final String city;
  final String region;
  final String country;

  const AdminShop({
    required this.id,
    required this.name,
    required this.owner,
    required this.status,
    required this.users,
    required this.sales,
    required this.city,
    required this.region,
    required this.country,
  });

  AdminShop copyWith({
    String? id,
    String? name,
    String? owner,
    AdminShopStatus? status,
    int? users,
    int? sales,
    String? city,
    String? region,
    String? country,
  }) {
    return AdminShop(
      id: id ?? this.id,
      name: name ?? this.name,
      owner: owner ?? this.owner,
      status: status ?? this.status,
      users: users ?? this.users,
      sales: sales ?? this.sales,
      city: city ?? this.city,
      region: region ?? this.region,
      country: country ?? this.country,
    );
  }
}

enum AdminShopStatus { active, pending, suspended, rejected }
