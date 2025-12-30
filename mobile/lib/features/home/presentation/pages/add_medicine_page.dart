import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:meditrack/features/home/domain/med_user_data.dart';
import 'package:meditrack/utils/common_snackbar.dart';
import 'package:meditrack/utils/notifications_utils.dart';

import '../bloc/home_bloc.dart';
import '../widget/home_widget.dart';

class AddMedicationPage extends StatefulWidget {
  const AddMedicationPage({super.key});

  @override
  State<AddMedicationPage> createState() => _AddMedicationPageState();
}

class _AddMedicationPageState extends State<AddMedicationPage> {
  int selectedTypeIndex = 1;
  String selectedTiming = "After meals";
  final TextEditingController medTitleController = TextEditingController();
  List<int> reminderDays = [];
  TimeOfDay? reminderTime;

  final List<Map<String, dynamic>> medTypes = [
    {'icon': Icons.circle, 'color': Colors.grey, 'label': 'Tablet'},
    {'icon': Icons.medication, 'color': Colors.orange, 'label': 'Capsule'},
    {'icon': Icons.vaccines, 'color': Colors.redAccent, 'label': 'Injection'},
    {'icon': Icons.water_drop, 'color': Colors.cyan, 'label': 'Drops'},
    {'icon': Icons.sanitizer, 'color': Colors.teal, 'label': 'Cream'},
    {'icon': Icons.biotech, 'color': Colors.blue, 'label': 'Ampoule'},
    {'icon': Icons.air, 'color': Colors.brown, 'label': 'Inhaler'},
    {'icon': Icons.science, 'color': Colors.purple, 'label': 'Syrup'},
  ];

  final List<String> timings = ["Before meals", "After meals", "With meals"];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.close, color: Colors.black),
            onPressed: () => Navigator.pop(context),
          ),
          const SizedBox(width: 20)
        ],
      ),
      body: BlocConsumer<HomeBloc, HomeState>(
        listener: (context, state) {
          if (state is HomeFailureState) {
            commonSnackBar(context, state.msgFailure ?? "An error occurred",
                Colors.white, Colors.red.shade400);
          }
          if (state is HomeSuccessState) {
            commonSnackBar(context, "Medication added successfully!",
                Colors.white, Colors.green.shade400);
            Navigator.pop(context); // Go back on success
          }
        },
        builder: (context, state) {
          return Stack(
            children: [
              // Main UI
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text("Add medication",
                        style: TextStyle(
                            fontSize: 28, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 30),
                    const Text("Medication Type",
                        style: TextStyle(
                            fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 15),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      physics: const BouncingScrollPhysics(),
                      child: Row(
                        children: List.generate(
                          medTypes.length,
                          (index) => Column(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              Padding(
                                padding: const EdgeInsets.only(right: 12),
                                child: GestureDetector(
                                  onTap: () =>
                                      setState(() => selectedTypeIndex = index),
                                  child: TypeSelector(
                                    icon: medTypes[index]['icon'],
                                    color: medTypes[index]['color'],
                                    isSelected: selectedTypeIndex == index,
                                  ),
                                ),
                              ),
                              Text(medTypes[index]['label'],
                                  style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 40),
                    const Text("Medical Info",
                        style: TextStyle(
                            fontSize: 20, fontWeight: FontWeight.bold)),
                    TextField(
                      controller: medTitleController,
                      decoration: const InputDecoration(
                        hintText: "Name of pill, e.g. Omega 3",
                        border: InputBorder.none,
                        hintStyle: TextStyle(color: Colors.grey),
                      ),
                    ),
                    const SizedBox(height: 30),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: timings
                            .map((time) => GestureDetector(
                                  onTap: () =>
                                      setState(() => selectedTiming = time),
                                  child: _buildTimingChip(
                                      time, selectedTiming == time),
                                ))
                            .toList(),
                      ),
                    ),
                    const SizedBox(height: 30),
                    const Text("Notification Time",
                        style: TextStyle(
                            fontSize: 20, fontWeight: FontWeight.bold)),
                    _buildScheduleButton(context),
                    const Spacer(),
                    _buildSubmitButton(state), // Pass state to disable button
                    const SizedBox(height: 20),
                  ],
                ),
              ),

              // Loading Overlay
              if (state is HomeLoadingState)
                Container(
                  color: Colors.black.withOpacity(0.3),
                  child: const Center(
                    child: CircularProgressIndicator(
                      color: Colors.blue,
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildScheduleButton(BuildContext context) {
    return ElevatedButton(
      style: ElevatedButton.styleFrom(
          backgroundColor: Colors.grey.shade100, elevation: 0),
      onPressed: () async {
        final schedule = await pickMultiSchedule(context);
        if (schedule != null) {
          setState(() {
            reminderDays = schedule.daysOfTheWeek;
            reminderTime = schedule.timeOfDay;
          });
        }
      },
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Text(
          reminderTime == null
              ? "+ Add Time & Days"
              : "Set for: ${reminderTime!.format(context)} on ${reminderDays.length} days",
          style: const TextStyle(color: Colors.black),
        ),
      ),
    );
  }

  Widget _buildSubmitButton(HomeState state) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
            backgroundColor: Colors.blue, elevation: 0),
        onPressed: (state is HomeLoadingState)
            ? null // Disable button while loading
            : () {
                // Pre-validation to avoid sending empty data
                if (medTitleController.text.isEmpty ||
                    reminderTime == null ||
                    reminderDays.isEmpty) {
                  commonSnackBar(
                      context,
                      "Please fill all fields and set a time",
                      Colors.white,
                      Colors.orange);
                  return;
                }

                final Map<String, dynamic> medicationData = {
                  "id": createUniqueId(),
                  "name": medTitleController.text,
                  "dosage": "1",
                  "type_label": medTypes[selectedTypeIndex]['label'],
                  "type_color":
                      medTypes[selectedTypeIndex]['color'].value.toString(),
                  "instructions": selectedTiming,
                  "reminder_days": reminderDays,
                  "reminder_hour": reminderTime!.hour,
                  "reminder_minute": reminderTime!.minute,
                  "total_pills_count": null,
                  "created_at": DateTime.now().toIso8601String(),
                };

                final medInfo = MedicationModel.fromMap(medicationData);
                context
                    .read<HomeBloc>()
                    .add(AddUserSchedulesEvent(medInfo: medInfo));
              },
        child: const Text("Add Medication",
            style: TextStyle(color: Colors.white, fontSize: 18)),
      ),
    );
  }

  Widget _buildTimingChip(String label, bool isSelected) {
    return Container(
      margin: const EdgeInsets.only(right: 12),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
      decoration: BoxDecoration(
        color: isSelected ? Colors.grey.shade100 : Colors.white,
        borderRadius: BorderRadius.circular(30),
        border: isSelected ? null : Border.all(color: Colors.grey.shade100),
      ),
      child: Text(label,
          style: TextStyle(
              color: isSelected ? Colors.black : Colors.grey,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
    );
  }
}
