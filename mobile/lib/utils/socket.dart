import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show setEquals;
import 'package:pos_app/services/app_constants.dart';
import 'package:pos_app/services/get_current_user.dart';
import 'package:pos_app/services/api/auth_storage.dart';
import 'package:pos_app/utils/permission_notifier.dart';

IO.Socket? _socket;

void initSocket(String token, UserProvider userProvider) {
  try {
    disconnectSocket();

    final url = AppConstants.baseUrl;

    _socket = IO.io(
        url,
        IO.OptionBuilder()
            .setTransports(['websocket'])
            .disableAutoConnect()
            .setAuth({'token': token})
            .build());

    _socket?.on('connect', (_) {
      debugPrint('[socket] connected (socket id=${_socket?.id})');
      // Emit if server expects authenticate event
      try {
        debugPrint('[socket] sending authenticate');
        _socket?.emit('authenticate', token);
      } catch (e) {
        debugPrint('[socket] authenticate emit failed: $e');
      }
    });

    _socket?.on('permissions_updated', (payload) async {
      try {
        debugPrint('[socket] permissions_updated: $payload');

        if (payload == null) return;
        final userId = payload['userId']?.toString();
        final permsRaw = payload['permissions'];
        final perms = <String>[];
        if (permsRaw is List) perms.addAll(permsRaw.map((e) => e.toString()));

        // If the current user is the affected user, update session
        final current = userProvider.user;
        if (current != null && current.id != null && current.id == userId) {
          // Compare as sets and skip if identical (avoid repeated notifications)
          final currentSet = Set<String>.from(current.permissions ?? []);
          final incomingSet = Set<String>.from(perms);
          if (setEquals(currentSet, incomingSet)) {
            debugPrint('[socket] permissions identical, skipping apply/notify');
            return;
          }

          final updated = current.copyWith(permissions: perms);
          await userProvider.setUser(updated);
          debugPrint('[socket] applied permissions update to current session');

          // Build a descriptive message showing which permissions changed and who did it
          final added = incomingSet.difference(currentSet).toList();
          final removed = currentSet.difference(incomingSet).toList();
          final parts = <String>[];
          if (added.isNotEmpty) parts.add('Added: ${added.join(', ')}');
          if (removed.isNotEmpty) parts.add('Removed: ${removed.join(', ')}');

          // Actor information (optional)
          final actorRaw = payload['actor'] ?? {};
          final actorRole =
              actorRaw is Map ? (actorRaw['role']?.toString() ?? '') : '';
          final actorName = actorRaw is Map
              ? (actorRaw['name']?.toString() ??
                  actorRaw['id']?.toString() ??
                  '')
              : '';
          final actorLabel = actorRole.isNotEmpty
              ? (actorName.isNotEmpty
                  ? '${actorRole[0].toUpperCase()}${actorRole.substring(1)} ${actorName}'
                  : actorRole)
              : (actorName.isNotEmpty ? actorName : 'administrator');

          final base =
              parts.isNotEmpty ? parts.join(' ; ') : 'Permissions updated';
          final msg = '$base — by $actorLabel';

          try {
            PermissionNotifier.instance.notify(msg);
          } catch (e) {
            debugPrint('[socket] failed to notify permission change: $e');
          }
        }
      } catch (e) {
        debugPrint('[socket] failed to handle permissions_updated: $e');
      }
    });

    _socket?.connect();
  } catch (e) {
    debugPrint('[socket] init failed: $e');
  }
}

void disconnectSocket() {
  try {
    if (_socket != null) {
      _socket?.disconnect();
      _socket = null;
    }
  } catch (e) {
    debugPrint('[socket] disconnect error: $e');
  }
}
