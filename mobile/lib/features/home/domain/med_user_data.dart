import 'package:flutter/material.dart';

class MedicationModel {
  final int id;
  final String name;
  final String dosage;
  final String typeLabel;
  final String typeColor; // Stored as String for DB compatibility
  final String instructions;
  final List<int> reminderDays;
  final int? reminderHour;
  final int? reminderMinute;
  final int? totalPillsCount;
  final String createdAt;
  final int? pillsTaken;

  MedicationModel({
    required this.id,
    required this.name,
    required this.dosage,
    required this.typeLabel,
    required this.typeColor,
    required this.instructions,
    required this.reminderDays,
    this.reminderHour,
    this.reminderMinute,
    this.totalPillsCount,
    required this.createdAt,
    required this.pillsTaken,
  });

  // Helper: Converts the stored String color back to a Flutter Color object
  Color get getColor => Color(int.parse(typeColor));

  // Helper: Formats the time for display (e.g., "08:30 AM")
  String get formattedTime {
    if (reminderHour == null || reminderMinute == null) return "No time set";
    final hour = reminderHour! > 12
        ? reminderHour! - 12
        : (reminderHour == 0 ? 12 : reminderHour);
    final period = reminderHour! >= 12 ? "PM" : "AM";
    final minute =
        reminderMinute! < 10 ? "0$reminderMinute" : "$reminderMinute";
    return "$hour:$minute $period";
  }

  // --- JSON Serialization ---

  // Converts the Model to a Map (for Database/JSON storage)
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'dosage': dosage,
      'type_label': typeLabel,
      'type_color': typeColor,
      'instructions': instructions,
      'reminder_days': reminderDays,
      'reminder_hour': reminderHour,
      'reminder_minute': reminderMinute,
      'total_pills_count': totalPillsCount,
      'pills_taken': pillsTaken,
      'created_at': createdAt,
    };
  }

  // Creates a Model from a Map (when reading from Database/JSON)
  factory MedicationModel.fromMap(Map<String, dynamic> map) {
    return MedicationModel(
      id: map['id']?.toInt() ?? 0,
      name: map['name'] ?? '',
      dosage: map['dosage'] ?? '',
      typeLabel: map['type_label'] ?? '',
      typeColor: map['type_color'] ?? '',
      instructions: map['instructions'] ?? '',
      // Handles conversion of dynamic list from JSON to List<int>
      reminderDays: List<int>.from(map['reminder_days'] ?? []),
      reminderHour: map['reminder_hour']?.toInt(),
      reminderMinute: map['reminder_minute']?.toInt(),
      totalPillsCount: map['total_pills_count']?.toInt(),
      pillsTaken: map['pills_taken'],
      createdAt: map['created_at'] ?? '',
    );
  }

  // --- CopyWith ---
  // Useful for updating specific fields (like subtracting a pill from totalPillsCount)
  MedicationModel copyWith({
    int? id,
    String? name,
    String? dosage,
    String? typeLabel,
    String? typeColor,
    String? instructions,
    List<int>? reminderDays,
    int? reminderHour,
    int? reminderMinute,
    int? totalPillsCount,
    int? pills_taken,
    String? createdAt,
  }) {
    return MedicationModel(
      id: id ?? this.id,
      name: name ?? this.name,
      dosage: dosage ?? this.dosage,
      typeLabel: typeLabel ?? this.typeLabel,
      typeColor: typeColor ?? this.typeColor,
      instructions: instructions ?? this.instructions,
      reminderDays: reminderDays ?? this.reminderDays,
      reminderHour: reminderHour ?? this.reminderHour,
      reminderMinute: reminderMinute ?? this.reminderMinute,
      totalPillsCount: totalPillsCount ?? this.totalPillsCount,
      pillsTaken: pillsTaken ?? this.pillsTaken,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
