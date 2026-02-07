import 'package:flutter/material.dart';
import 'package:flutter_feature_tour/flutter_feature_tour.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'storage_services.dart';

class Global {
  static late StorageServices storageServices;

  static Future init() async {
    WidgetsFlutterBinding.ensureInitialized();

    const secureStorage = FlutterSecureStorage();

    storageServices = StorageServices(secureStorage);

    await OnboardingService().initialize();
    // await dotenv.load(fileName: ".env");
  }
}

