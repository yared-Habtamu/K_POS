import 'package:flutter/material.dart';
import 'package:flutter_feature_tour/flutter_feature_tour.dart';
import 'package:pos_app/services/storage_services.dart';

class Global {
  static late StorageServices storageServices;

  static Future init() async {
    WidgetsFlutterBinding.ensureInitialized();
    storageServices = await StorageServices().init();
    await OnboardingService().initialize();
    // await dotenv.load(fileName: ".env");
  }
}
