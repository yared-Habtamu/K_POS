
# New Flutter Project

This is a new Flutter project, created using the standard Flutter CLI.

## Getting Started

**Note:** Make sure you have set up your environment by following the [Flutter Installation Guide](https://docs.flutter.dev/get-started/install) before proceeding.

### Step 1: Install Dependencies

Before running the app, you need to download the package dependencies defined in `pubspec.yaml`.

Run the following command from the root of your Flutter project:

```bash
flutter pub get
```

### Step 2: Run your app

With dependencies installed, ensure you have a connected device or an emulator/simulator running.

**Android & iOS**

To run the app on the connected device (Android or iOS), use:

```bash
flutter run
```

**iOS Specifics**

For iOS, you generally don't need to install CocoaPods manually as Flutter handles this during the build. However, if you add complex native dependencies or run into issues, you may need to run:

```bash
cd ios
pod install
cd ..
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

You can also build and run the app directly from **VS Code** (Run > Start Debugging) or **Android Studio**.

### Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `lib/main.dart` in your text editor of choice and make some changes. When you save, you can trigger **Hot Reload** to see changes almost instantly without losing the app's state.

**Terminal Controls:**

While the app is running in the terminal:

*   **Hot Reload:** Press `r` (lower case). This updates code quickly while maintaining state.
*   **Hot Restart:** Press `R` (upper case). This resets the app state and rebuilds the app completely.
*   **Quit:** Press `q` to stop the app.

## Congratulations! 🎉

You've successfully run and modified your Flutter App. 🥳

## Now what?

If you want to add this new Flutter code to an existing native application, check out the [Add-to-App guide](https://docs.flutter.dev/add-to-app).

## Troubleshooting

If you're having issues getting the above steps to work, run the following command to diagnose your environment:

```bash
flutter doctor
```

This tool checks your environment and displays a report to the terminal of the status of your Flutter installation.

## Learn More

To learn more about Flutter, take a look at the following resources:

*   [Flutter Website](https://flutter.dev) - learn more about Flutter.
*   [Write your first Flutter app](https://docs.flutter.dev/get-started/codelab) - a guided codelab.
*   [Cookbook](https://docs.flutter.dev/cookbook) - useful Flutter samples.
*   [Flutter API Reference](https://api.flutter.dev/) - detailed documentation for the framework.
*   [flutter/flutter](https://github.com/flutter/flutter) - the Open Source GitHub repository for Flutter.