part of 'manager_bloc.dart';

@immutable
sealed class ManagerEvent {}

class ManagerAssetFetchingEvent extends ManagerEvent {
  String martID;
  ManagerAssetFetchingEvent({required this.martID});
}

class ManagerAssetRegistrations extends ManagerEvent {
  final String name;
  final int quantity;
  final String martId;

  ManagerAssetRegistrations({
    required this.name,
    required this.quantity,
    required this.martId,
  });
}

class ManagerAssetRemoval extends ManagerEvent {
  String assetId;
  ManagerAssetRemoval({
    required this.assetId,
  });
}

class ManagerAssetExportCSV extends ManagerEvent {}

class ManagerAssetPrint extends ManagerEvent {}

class ManagerFetchAlertEvent extends ManagerEvent {}

class ManagerFetchSoonExpiredProduct extends ManagerEvent {}

class ManagerFetchProducts extends ManagerEvent {
  String martID;
  ManagerFetchProducts({required this.martID});
}

class ManagerReportProductStatEvent extends ManagerEvent {
  String? martID;
  String range;
  ManagerReportProductStatEvent({
    required this.range,
     this.martID,
  });
}
