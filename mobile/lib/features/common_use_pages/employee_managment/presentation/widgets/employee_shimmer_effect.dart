import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

class EmployeeManagementShimmer extends StatelessWidget {
  const EmployeeManagementShimmer({super.key});

  @override
  Widget build(BuildContext context) {
    // Define the colors for the shimmer effect (Modern Soft Grey)
    final baseColor = Colors.grey.shade300;
    final highlightColor = Colors.grey.shade100;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Shimmer.fromColors(
        baseColor: baseColor,
        highlightColor: highlightColor,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. TOP TABS MIMIC
            Container(
              height: 45,
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Expanded(
                      child: _SkeletonBox(height: double.infinity, radius: 8)),
                  const SizedBox(width: 8),
                  Expanded(
                      child: Container()), // Empty space for unselected tab
                ],
              ),
            ),
            const SizedBox(height: 24),

            // 2. HEADER SECTION (Title + Add Button)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    _SkeletonBox(width: 120, height: 24), // Title
                    SizedBox(height: 8),
                    _SkeletonBox(width: 180, height: 14), // Subtitle
                  ],
                ),
                const _SkeletonBox(
                    width: 100, height: 40, radius: 8), // Add Button
              ],
            ),
            const SizedBox(height: 20),

            // 3. SEARCH & FILTER BAR
            Row(
              children: const [
                Expanded(
                    child: _SkeletonBox(height: 48, radius: 8)), // Search Input
                SizedBox(width: 12),
                _SkeletonBox(
                    width: 100, height: 48, radius: 8), // Filter Dropdown
              ],
            ),
            const SizedBox(height: 24),

            // 4. TABLE HEADER MIMIC
            Row(
              children: const [
                _SkeletonBox(width: 80, height: 16),
                Spacer(),
                _SkeletonBox(width: 60, height: 16),
                Spacer(),
                _SkeletonBox(width: 60, height: 16),
              ],
            ),
            const Divider(height: 24),

            // 5. LIST ITEMS (The "Table" Rows)
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: 6, // Show 6 dummy items
              separatorBuilder: (_, __) => const SizedBox(height: 16),
              itemBuilder: (_, index) {
                return Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white, // The "card" background color
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white),
                  ),
                  child: Row(
                    children: [
                      // Avatar Placeholder
                      const CircleAvatar(
                          radius: 20, backgroundColor: Colors.white),
                      const SizedBox(width: 16),

                      // Name & Phone
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          _SkeletonBox(width: 100, height: 14),
                          SizedBox(height: 6),
                          _SkeletonBox(width: 60, height: 12),
                        ],
                      ),
                      const Spacer(),

                      // Role Badge
                      const _SkeletonBox(width: 70, height: 24, radius: 12),
                      const SizedBox(width: 16),

                      // Active Toggle
                      const _SkeletonBox(width: 40, height: 20, radius: 10),
                    ],
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

// A Helper Widget to draw the grey boxes
class _SkeletonBox extends StatelessWidget {
  final double width;
  final double height;
  final double radius;

  const _SkeletonBox({
    this.width = double.infinity,
    required this.height,
    this.radius = 4,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(radius),
      ),
    );
  }
}
