import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:get/get.dart';

class DashboardHeader extends StatelessWidget {
  final VoidCallback onInvite;
  final VoidCallback onRegister;

  const DashboardHeader({
    super.key,
    required this.onInvite,
    required this.onRegister
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, constraints) {
      final isSmall = constraints.maxWidth < 600;

      final title = Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(height: 6.0.h),
          Text(
            "welcome_text".tr,
            style: TextStyle(
              fontSize: 15.0.sp,
              color: Colors.grey.shade600,
              height: 1.4,
            ),
          ),
        ],
      );

      final buttons = Row(
        children: [
          _ActionButton(
            label: 'invite'.tr,
            icon: Icons.person_add_alt_1_rounded,
            isPrimary: false,
            onTap: onInvite,
          ),
          const SizedBox(width: 12),
          _ActionButton(
            label: 'new_mart'.tr,
            icon: Icons.store_rounded,
            isPrimary: true,
            onTap: onRegister,
          ),
        ],
      );

      if (isSmall) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [title, const SizedBox(height: 20), buttons],
        );
      }

      return Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [title, buttons],
      );
    });
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool isPrimary;
  final VoidCallback onTap;

  const _ActionButton({
    required this.label,
    required this.icon,
    required this.isPrimary,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12.r),
      child: Container(
        height: 48.h,
        padding: EdgeInsets.symmetric(horizontal: 20.w),
        decoration: BoxDecoration(
          color: isPrimary ? const Color(0xFF0F172A) : Colors.white,
          borderRadius: BorderRadius.circular(12.r),
          border: isPrimary ? null : Border.all(color: Colors.grey.shade300),
          boxShadow: isPrimary
              ? [
            BoxShadow(
              color: const Color(0xFF0F172A).withOpacity(0.2),
              blurRadius: 12,
              offset: const Offset(0, 4),
            )
          ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 18.sp,
              color: isPrimary ? Colors.white : const Color(0xFF0F172A),
            ),
            SizedBox(width: 8.w),
            Text(
              label,
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 14.sp,
                color: isPrimary ? Colors.white : const Color(0xFF0F172A),
              ),
            ),
          ],
        ),
      ),
    );
  }
}