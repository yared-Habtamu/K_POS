class GeneralNotificationModel {
  String? msgTitle;
  String? msgBody;
  DateTime? date;

  GeneralNotificationModel({
    required this.msgTitle,
    required this.msgBody,
    required this.date,
  });

  factory GeneralNotificationModel.fromJson(Map<String, dynamic> json) {
    return GeneralNotificationModel(
      msgTitle: json['msgTitle'],
      msgBody: json['msgBody'],
      date: json['date'] != null ? DateTime.parse(json['date']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'msgTitle': msgTitle,
      'msgBody': msgBody,
      'date': date?.toIso8601String(),
    };
  }
}
