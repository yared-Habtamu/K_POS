import 'dart:developer' as dev;

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:meditrack/features/home/domain/med_user_data.dart';

class MedicationService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Helper to log and format error messages
  String _handleError(String action, dynamic e) {
    print("ERR: [$action]");

    if (e is FirebaseException) {
      switch (e.code) {
        case 'permission-denied':
          return "Access denied. Please ensure you are logged in.";
        case 'unavailable':
          return "Network error. Please check your internet connection.";
        case 'not-found':
          return "The requested medication data was not found.";
        case 'deadline-exceeded':
          return "The connection timed out. Please try again.";
        default:
          return "Database error: ${e.message}";
      }
    }
    return "An unexpected error occurred. Please try again later.";
  }

  // 1. ADD OR UPDATE MEDICATION
  Future<void> addUserSchedule(String userId, MedicationModel med) async {
    dev.log("Action: Adding schedule '${med.name}' for user: $userId",
        name: "MedicationService");
    try {
      await _firestore
          .collection('users')
          .doc(userId)
          .collection('medSchedules')
          .doc(med.id.toString())
          .set(med.toMap());
      print("Success: Added ${med.name} MedicationService");
    } catch (e) {
      throw _handleError("addUserSchedule", e);
    }
  }

  // 2. FETCH ALL MEDICATIONS FOR A USER
  Future<List<MedicationModel>> fetchUserSchedules(String userId) async {
    dev.log("Action: Fetching schedules for user: $userId",
        name: "MedicationService");
    try {
      QuerySnapshot snapshot = await _firestore
          .collection('users')
          .doc(userId)
          .collection('medSchedules')
          .orderBy('created_at', descending: true)
          .get();

      final meds = snapshot.docs.map((doc) {
        return MedicationModel.fromMap(doc.data() as Map<String, dynamic>);
      }).toList();

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
      await _firestore
          .collection('users')
          .doc(userId)
          .collection('medSchedules')
          .doc(medId.toString())
          .update({'total_pills_count': newCount});
      dev.log("Success: Updated pill count", name: "MedicationService");
    } catch (e) {
      throw _handleError("updatePillCount", e);
    }
  }

  // 4. DELETE MEDICATION
  Future<void> deleteMedication(String userId, int medId) async {
    dev.log("Action: Deleting medication: $medId", name: "MedicationService");
    try {
      await _firestore
          .collection('users')
          .doc(userId)
          .collection('medSchedules')
          .doc(medId.toString())
          .delete();
      dev.log("Success: Deleted medication", name: "MedicationService");
    } catch (e) {
      throw _handleError("deleteMedication", e);
    }
  }
}
