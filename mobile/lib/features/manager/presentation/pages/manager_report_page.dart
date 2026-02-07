import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:pos_app/services/get_current_user.dart';

import '../bloc/manager_bloc.dart';
import '../widgets/manager_report_sections.dart';

enum ReportPeriod { daily, weekly, monthly, custom }

class ManagerReportPage extends StatefulWidget {
  const ManagerReportPage({super.key});

  @override
  State<ManagerReportPage> createState() => _ManagerReportPageState();
}

class _ManagerReportPageState extends State<ManagerReportPage>
    with SingleTickerProviderStateMixin {
  ReportPeriod _selectedPeriod = ReportPeriod.monthly;
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    // Initialize animation controller for the entry animations
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..forward();
    initReport();
  }

  initReport() async {
    final martID = await context.read<UserProvider>().martId;
    context.read<ManagerBloc>().add(
          ManagerReportProductStatEvent(
            range: "monthly",
            martID: martID ?? '',
          ),
        );
  }

  void _updatePeriod(ReportPeriod period) {
    setState(() => _selectedPeriod = period);

    String range = period.name; // daily, weekly, monthly

    context.read<ManagerBloc>().add(
          ManagerReportProductStatEvent(range: range),
        );

    HapticFeedback.selectionClick();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Color(0xFFF3F5F9),
      body: SafeArea(
        bottom: false,
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 10.h),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. Enthusiastic Header
              _FadeSlide(
                controller: _controller,
                delay: 0,
                child: const _ModernHeader(),
              ),

              SizedBox(height: 24.h),

              // 2. Interactive Filters
              _FadeSlide(
                controller: _controller,
                delay: 100,
                child: SizedBox(
                  height: 45.h,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    physics: const BouncingScrollPhysics(),
                    children: [
                      _FilterChip(
                        label: 'Daily',
                        isSelected: _selectedPeriod == ReportPeriod.daily,
                        onTap: () => _updatePeriod(ReportPeriod.daily),
                      ),
                      _FilterChip(
                        label: 'Weekly',
                        isSelected: _selectedPeriod == ReportPeriod.weekly,
                        onTap: () => _updatePeriod(ReportPeriod.weekly),
                      ),
                      _FilterChip(
                        label: 'Monthly',
                        isSelected: _selectedPeriod == ReportPeriod.monthly,
                        onTap: () => _updatePeriod(ReportPeriod.monthly),
                      ),
                      _FilterChip(
                        label: 'Custom Range',
                        isSelected: _selectedPeriod == ReportPeriod.custom,
                        isSpecial: true, // Special styling
                        onTap: () => _updatePeriod(ReportPeriod.custom),
                      ),
                    ],
                  ),
                ),
              ),

              SizedBox(height: 24.h),

              // 3. Stats Grid with Hover/Glow effect implied
              BlocBuilder<ManagerBloc, ManagerState>(
                builder: (context, state) {
                  return StatsGrid(
                    totalSales: '\$${state.totalSales.toStringAsFixed(2)}',
                    totalOrders: state.totalOrders.toString(),
                    avgOrder: '\$${state.avgOrder.toStringAsFixed(2)}',
                  );
                },
              ),

              SizedBox(height: 24.h),

              // 4. Charts with Modern Layout Logic
              BlocConsumer<ManagerBloc, ManagerState>(
                listener: (context, state) {
                  // TODO: implement listener
                },
                builder: (context, state) {
                  return _FadeSlide(
                    controller: _controller,
                    delay: 300,
                    child: LayoutBuilder(builder: (context, constraints) {
                      if (constraints.maxWidth > 700) {
                        return Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: PaymentMethodsSection(
                                methods: state.paymentMethods,
                              ),
                            ),
                            SizedBox(width: 16.w),
                            Expanded(
                              child: TopSellingProductsSection(
                                products: state.topProducts,
                              ),
                            ),
                          ],
                        );
                      }
                      return Column(
                        children: [
                          PaymentMethodsSection(
                            methods: state.paymentMethods,
                          ),
                          SizedBox(height: 16.h),
                          TopSellingProductsSection(
                            products: state.topProducts,
                          ),
                        ],
                      );
                    }),
                  );
                },
              ),

              SizedBox(height: 24.h),

              // 5. Tax Summary (Bottom Card)
              _FadeSlide(
                controller: _controller,
                delay: 400,
                child: Container(
                  padding: EdgeInsets.all(20.r),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Colors.white, Colors.grey.shade50],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(20.r),
                    boxShadow: [
                      BoxShadow(
                          color: Colors.grey.withOpacity(0.05),
                          blurRadius: 10,
                          offset: const Offset(0, 5)),
                    ],
                    border: Border.all(color: Colors.white),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: EdgeInsets.all(10.r),
                            decoration: BoxDecoration(
                              color: Colors.orange.shade50,
                              borderRadius: BorderRadius.circular(12.r),
                            ),
                            child: Icon(Icons.receipt_long_rounded,
                                color: Colors.orange, size: 24.sp),
                          ),
                          SizedBox(width: 12.w),
                          Text(
                            'Estimated Tax',
                            style: TextStyle(
                              fontSize: 15.sp,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF1F2937),
                            ),
                          ),
                        ],
                      ),
                      Text('\$45.20',
                          style: TextStyle(
                              fontSize: 18.sp,
                              fontWeight: FontWeight.w800,
                              color: Colors.red.shade400)),
                    ],
                  ),
                ),
              ),

              SizedBox(height: 40.h), // Bottom padding
            ],
          ),
        ),
      ),
    );
  }
}

// --- NEW COMPONENT: Enthusiastic Header ---
class _ModernHeader extends StatelessWidget {
  const _ModernHeader();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(24.r),
      decoration: BoxDecoration(
        color: Color(0xFF1E2230),
        borderRadius: BorderRadius.circular(24.r),
        boxShadow: [
          BoxShadow(
            color: Color(0xFF1E2230).withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Good Morning! ☀️',
                    style: TextStyle(color: Colors.white70, fontSize: 13.sp),
                  ),
                  SizedBox(height: 6.h),
                  Text(
                    'Sales Overview',
                    style: TextStyle(
                        color: Colors.white,
                        fontSize: 22.sp,
                        fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              Container(
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12.r),
                ),
                child: IconButton(
                  icon: const Icon(Icons.calendar_month_outlined,
                      color: Colors.white),
                  onPressed: () {},
                ),
              )
            ],
          ),
          SizedBox(height: 20.h),
          // Mini internal dashboard inside header
          Container(
            padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 12.h),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.08),
              borderRadius: BorderRadius.circular(16.r),
              border: Border.all(color: Colors.white.withOpacity(0.1)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('📅  1 Jan - 31 Jan',
                    style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w500,
                        fontSize: 13.sp)),
                Row(
                  children: [
                    _SmallActionBtn(icon: Icons.download_rounded, onTap: () {}),
                    SizedBox(width: 8.w),
                    _SmallActionBtn(icon: Icons.share_rounded, onTap: () {}),
                  ],
                )
              ],
            ),
          )
        ],
      ),
    );
  }
}

class _SmallActionBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _SmallActionBtn({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8.r),
      child: Container(
        padding: EdgeInsets.all(6.r),
        decoration: BoxDecoration(
          color: Color(0xFF3B82F6),
          borderRadius: BorderRadius.circular(8.r),
        ),
        child: Icon(icon, color: Colors.white, size: 16.sp),
      ),
    );
  }
}

// --- NEW COMPONENT: Interactive Filter Chip ---
class _FilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;
  final bool isSpecial;

  const _FilterChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
    this.isSpecial = false,
  });

  @override
  Widget build(BuildContext context) {
    // Styling logic
    final backgroundColor = isSelected
        ? (isSpecial ? Color(0xFF1E2230) : Color(0xFF3B82F6))
        : Colors.white;

    final textColor = isSelected ? Colors.white : Color(0xFF9CA3AF);
    final borderColor = isSelected ? Colors.transparent : Colors.grey.shade200;
    final fontWeight = isSelected ? FontWeight.w700 : FontWeight.w500;

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
        margin: EdgeInsets.only(right: 10.w),
        padding: EdgeInsets.symmetric(horizontal: 20.w, vertical: 0),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: BorderRadius.circular(30.r),
          border: Border.all(color: borderColor),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                      color: backgroundColor.withOpacity(0.4),
                      blurRadius: 8,
                      offset: const Offset(0, 4))
                ]
              : [],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isSpecial && isSelected) ...[
              Icon(Icons.tune, color: Colors.white, size: 14.sp),
              SizedBox(width: 6.w),
            ],
            Text(
              label,
              style: TextStyle(
                color: textColor,
                fontSize: 13.sp,
                fontWeight: fontWeight,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// --- ANIMATION HELPER: Staggered Fade Slide ---
class _FadeSlide extends StatelessWidget {
  final AnimationController controller;
  final int delay; // delay in milliseconds
  final Widget child;

  const _FadeSlide(
      {required this.controller, required this.delay, required this.child});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, child) {
        // Calculate a 0.0 to 1.0 interval based on delay
        // The animation starts after 'delay' milliseconds and takes 400ms to complete
        final start = delay / 1200;
        final end = (delay + 400) / 1200;

        final curve = CurvedAnimation(
          parent: controller,
          curve:
              Interval(start, end > 1.0 ? 1.0 : end, curve: Curves.easeOutQuad),
        );

        return Opacity(
          opacity: curve.value,
          child: Transform.translate(
            offset: Offset(0, 20 * (1 - curve.value)), // Slide up by 20 pixels
            child: child,
          ),
        );
      },
      child: child,
    );
  }
}
