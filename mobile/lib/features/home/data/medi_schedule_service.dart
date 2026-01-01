import 'dart:developer' as dev;

import 'package:pos_app/features/home/domain/med_user_data.dart';

class MedicationService {
  // NOTE: This app currently runs with mock/local data.
  // Keeping this service in-memory avoids requiring Firebase/Firestore
  // dependencies just to compile and run the POS UI.
  static final Map<String, List<MedicationModel>> _storeByUser = {};

  // Helper to log and format error messages
  String _handleError(String action, dynamic e) {
    dev.log('ERR: [$action] $e', name: 'MedicationService');
    return 'An unexpected error occurred. Please try again later.';
  }

  // 1. ADD OR UPDATE MEDICATION
  Future<void> addUserSchedule(String userId, MedicationModel med) async {
    dev.log("Action: Adding schedule '${med.name}' for user: $userId",
        name: "MedicationService");
    try {
      final list = _storeByUser.putIfAbsent(userId, () => <MedicationModel>[]);
      final existingIndex = list.indexWhere((m) => m.id == med.id);
      if (existingIndex >= 0) {
        list[existingIndex] = med;
      } else {
        list.insert(0, med);
      }
      dev.log("Success: Added ${med.name}", name: "MedicationService");
    } catch (e) {
      throw _handleError("addUserSchedule", e);
    }
  }

  // 2. FETCH ALL MEDICATIONS FOR A USER
  Future<List<MedicationModel>> fetchUserSchedules(String userId) async {
    dev.log("Action: Fetching schedules for user: $userId",
        name: "MedicationService");
    try {
      final meds = List<MedicationModel>.of(_storeByUser[userId] ?? const <MedicationModel>[]);

      dev.log("Success: Fetched ${meds.length} medications",
          name: "MedicationService");
      return meds;
    } catch (e) {
      throw _handleError("fetchUserSchedules", e);
    }
  }

  // 3. UPDATE PILL COUNT
  Future<void> updatePillCount(String userId, int medId, int newCount) async {
    dev.log("Action: Updating pill count for med: $medId to $newCount",
        name: "MedicationService");
    try {
      final list = _storeByUser[userId];
      if (list == null) return;

      final idx = list.indexWhere((m) => m.id == medId);
      if (idx < 0) return;

      list[idx] = list[idx].copyWith(totalPillsCount: newCount);
      dev.log("Success: Updated pill count", name: "MedicationService");
    } catch (e) {
      throw _handleError("updatePillCount", e);
    }
  }

  // 4. DELETE MEDICATION
  Future<void> deleteMedication(String userId, int medId) async {
    dev.log("Action: Deleting medication: $medId", name: "MedicationService");
    try {
      final list = _storeByUser[userId];
      if (list == null) return;
      list.removeWhere((m) => m.id == medId);
      dev.log("Success: Deleted medication", name: "MedicationService");
    } catch (e) {
      throw _handleError("deleteMedication", e);
    }
  }
}
