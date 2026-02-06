import 'package:flutter/material.dart';

import '../../domain/employee_model.dart';
import '../../employee_utils.dart';
import 'employee_components.dart'; // Reuse SectionHeader from here

class AttendanceFiltersCard extends StatelessWidget {
  final String employeeValue;
  final List<String> employeeItems;
  final ValueChanged<String> onEmployeeChanged;
  final String dateRangeValue;
  final List<String> dateRangeItems;
  final ValueChanged<String> onDateRangeChanged;

  const AttendanceFiltersCard({
    super.key,
    required this.employeeValue,
    required this.employeeItems,
    required this.onEmployeeChanged,
    required this.dateRangeValue,
    required this.dateRangeItems,
    required this.onDateRangeChanged,
  });

  @override
  Widget build(BuildContext context) {
    Widget dropdown(
        String val, List<String> items, ValueChanged<String> change) {
      return Container(
        height: 46,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.grey.shade300)),
        child: DropdownButtonHideUnderline(
          child: DropdownButton<String>(
            isExpanded: true,
            value: val,
            items: items
                .map((r) => DropdownMenuItem(
                    value: r,
                    child: Text(r,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey.shade800,
                            fontWeight: FontWeight.w700))))
                .toList(),
            onChanged: (v) => {if (v != null) change(v)},
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.shade300)),
      child: LayoutBuilder(builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 700;
        final empWidget =
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Employee',
              style: TextStyle(
                  fontSize: 13,
                  color: Colors.grey.shade800,
                  fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          dropdown(employeeValue, employeeItems, onEmployeeChanged),
        ]);
        final rangeWidget =
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Date Range',
              style: TextStyle(
                  fontSize: 13,
                  color: Colors.grey.shade800,
                  fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          dropdown(dateRangeValue, dateRangeItems, onDateRangeChanged),
        ]);

        if (isNarrow) {
          return Column(
              children: [empWidget, const SizedBox(height: 12), rangeWidget]);
        }
        return Row(children: [
          Expanded(child: empWidget),
          const SizedBox(width: 16),
          Expanded(child: rangeWidget)
        ]);
      }),
    );
  }
}

class AddAttendanceManuallyCard extends StatelessWidget {
  final List<String> employees;
  final String selectedEmployee;
  final ValueChanged<String> onEmployeeChanged;
  final String dateText;
  final VoidCallback onPickDate;
  final String clockInText;
  final String clockOutText;
  final VoidCallback onPickClockIn;
  final VoidCallback onPickClockOut;
  final VoidCallback onSave;

  const AddAttendanceManuallyCard({
    super.key,
    required this.employees,
    required this.selectedEmployee,
    required this.onEmployeeChanged,
    required this.dateText,
    required this.onPickDate,
    required this.clockInText,
    required this.clockOutText,
    required this.onPickClockIn,
    required this.onPickClockOut,
    required this.onSave,
  });

  @override
  Widget build(BuildContext context) {
    // Reusing the dropdown logic could be extracted further, but keeping it local for simplicity
    Widget dropdown(
        String val, List<String> items, ValueChanged<String> change) {
      return Container(
        height: 46,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.grey.shade300)),
        child: DropdownButtonHideUnderline(
          child: DropdownButton<String>(
            isExpanded: true,
            value: val,
            items: items
                .map((r) => DropdownMenuItem(
                    value: r,
                    child: Text(r,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey.shade800,
                            fontWeight: FontWeight.w700))))
                .toList(),
            onChanged: (v) => {if (v != null) change(v)},
          ),
        ),
      );
    }

    Widget field(
        {required String text,
        required IconData icon,
        required VoidCallback onTap}) {
      return InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          height: 46,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.grey.shade300)),
          child: Row(children: [
            Expanded(
                child: Text(text,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                        fontSize: 13,
                        color: text.startsWith('--')
                            ? Colors.grey.shade500
                            : Colors.grey.shade800,
                        fontWeight: FontWeight.w700))),
            const SizedBox(width: 8),
            Icon(icon, size: 18, color: Colors.grey.shade700),
          ]),
        ),
      );
    }

    final employeeItems = ['Select Employee', ...employees];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.shade300)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Add Attendance Manually',
              style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: Colors.grey.shade900)),
          const SizedBox(height: 14),
          LayoutBuilder(builder: (context, constraints) {
            final isNarrow = constraints.maxWidth < 800;

            final empCol =
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Employee',
                  style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey.shade800,
                      fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              dropdown(selectedEmployee, employeeItems, onEmployeeChanged),
            ]);
            final dateCol =
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Date',
                  style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey.shade800,
                      fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              field(
                  text: dateText,
                  icon: Icons.calendar_month_outlined,
                  onTap: onPickDate),
            ]);
            final inCol =
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Clock In',
                  style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey.shade800,
                      fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              field(
                  text: clockInText,
                  icon: Icons.access_time,
                  onTap: onPickClockIn),
            ]);
            final outCol =
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Clock Out',
                  style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey.shade800,
                      fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              field(
                  text: clockOutText,
                  icon: Icons.access_time,
                  onTap: onPickClockOut),
            ]);
            final btn = ElevatedButton(
              onPressed: onSave,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue.shade900,
                foregroundColor: Colors.white,
                padding:
                    const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
              ),
              child: const Text('Save Attendance'),
            );

            if (isNarrow) {
              return Column(children: [
                empCol,
                const SizedBox(height: 12),
                dateCol,
                const SizedBox(height: 12),
                inCol,
                const SizedBox(height: 12),
                outCol,
                const SizedBox(height: 12),
                Align(alignment: Alignment.centerLeft, child: btn)
              ]);
            }
            return Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Expanded(child: empCol),
              const SizedBox(width: 14),
              Expanded(child: dateCol),
              const SizedBox(width: 14),
              Expanded(child: inCol),
              const SizedBox(width: 14),
              Expanded(child: outCol),
              const SizedBox(width: 14),
              btn
            ]);
          }),
        ],
      ),
    );
  }
}

class AttendanceRecordsCard extends StatelessWidget {
  final DateTime recordsDate;
  final VoidCallback onPrevDate;
  final VoidCallback onNextDate;
  final List<AttendanceRecord> records;
  final void Function(AttendanceRecord) onEditRecord;
  final void Function(AttendanceRecord) onDeleteRecord;

  const AttendanceRecordsCard({
    super.key,
    required this.recordsDate,
    required this.onPrevDate,
    required this.onNextDate,
    required this.records,
    required this.onEditRecord,
    required this.onDeleteRecord,
  });

  @override
  Widget build(BuildContext context) {
    final headerStyle = TextStyle(
        fontSize: 12, fontWeight: FontWeight.w700, color: Colors.grey.shade700);
    final columns = [
      DataColumn(label: Text('Employee', style: headerStyle)),
      DataColumn(label: Text('Role', style: headerStyle)),
      DataColumn(label: Text('Date', style: headerStyle)),
      DataColumn(label: Text('Clock In', style: headerStyle)),
      DataColumn(label: Text('Clock Out', style: headerStyle)),
      DataColumn(label: Text('Duration', style: headerStyle)),
      DataColumn(label: Text('Actions', style: headerStyle)),
    ];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.shade300)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          LayoutBuilder(builder: (context, constraints) {
            final isNarrow = constraints.maxWidth < 520;
            final title = Wrap(
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 12,
                runSpacing: 6,
                children: [
                  Text('Attendance Records',
                      style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: Colors.grey.shade900)),
                  Text('Showing ${records.length} records',
                      style:
                          TextStyle(fontSize: 12, color: Colors.grey.shade700)),
                ]);
            final nav = Row(children: [
              IconButton(
                  onPressed: onPrevDate,
                  icon: const Icon(Icons.chevron_left),
                  color: Colors.grey.shade700),
              Expanded(
                  child: Center(
                      child: Text(EmployeeUtils.formatYmd(recordsDate),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: Colors.grey.shade800)))),
              IconButton(
                  onPressed: onNextDate,
                  icon: const Icon(Icons.chevron_right),
                  color: Colors.grey.shade700),
            ]);

            if (isNarrow) {
              return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [title, const SizedBox(height: 8), nav]);
            }
            return Row(children: [
              Expanded(child: title),
              const SizedBox(width: 10),
              SizedBox(width: 280, child: nav)
            ]);
          }),
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.grey.shade200)),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: DataTable(
                  headingRowHeight: 44,
                  dataRowMinHeight: 54,
                  dataRowMaxHeight: 66,
                  horizontalMargin: 16,
                  columnSpacing: 26,
                  dividerThickness: 0.6,
                  columns: columns,
                  rows: records
                      .map((r) => DataRow(cells: [
                            DataCell(NameCell(name: r.employeeName)),
                            // Role cell: render badge if role exists and is not 'manager'/'owner'
                            DataCell(
                              r.employeeRole == null ||
                                      r.employeeRole!.toLowerCase() ==
                                          'manager' ||
                                      r.employeeRole!.toLowerCase() == 'owner'
                                  ? const SizedBox()
                                  : Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 10, vertical: 6),
                                      decoration: BoxDecoration(
                                        color: Colors.grey.shade100,
                                        borderRadius: BorderRadius.circular(16),
                                        border: Border.all(
                                            color: Colors.grey.shade200),
                                      ),
                                      child: Text(
                                        r.employeeRole ?? '',
                                        style: const TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w700),
                                      ),
                                    ),
                            ),
                            DataCell(Text(r.dateYmd,
                                style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600))),
                            DataCell(Text(r.clockIn,
                                style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600))),
                            DataCell(Text(r.clockOut,
                                style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600))),
                            DataCell(Text(r.duration,
                                style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600))),
                            DataCell(
                                Row(mainAxisSize: MainAxisSize.min, children: [
                              // Enable edit/delete only for records for today or earlier
                              Builder(builder: (c) {
                                bool editable = true;
                                try {
                                  final rd = DateTime.parse(r.dateYmd);
                                  final today = DateTime.now();
                                  final rdDate =
                                      DateTime(rd.year, rd.month, rd.day);
                                  final tDate = DateTime(
                                      today.year, today.month, today.day);
                                  editable = !rdDate.isAfter(tDate);
                                } catch (e) {
                                  editable = true;
                                }

                                return Row(children: [
                                  IconButton(
                                      onPressed: editable
                                          ? () => onEditRecord(r)
                                          : null,
                                      icon: const Icon(Icons.edit_outlined,
                                          size: 18),
                                      color: editable
                                          ? Colors.grey.shade700
                                          : Colors.grey.shade400),
                                  IconButton(
                                      onPressed: editable
                                          ? () => onDeleteRecord(r)
                                          : null,
                                      icon: const Icon(Icons.delete_outline,
                                          size: 18),
                                      color: editable
                                          ? Colors.red.shade400
                                          : Colors.grey.shade400),
                                ]);
                              })
                            ])),
                          ]))
                      .toList(),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
