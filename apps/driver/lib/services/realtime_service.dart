import 'package:socket_io_client/socket_io_client.dart' as io;

import 'driver_api.dart';

typedef ChatMessageHandler = void Function(Map<String, dynamic> payload);
typedef NotificationHandler = void Function(Map<String, dynamic> payload);
typedef FleetUpdateHandler = void Function(Map<String, dynamic> payload);

class DriverRealtimeService {
  DriverRealtimeService._();

  static final DriverRealtimeService instance = DriverRealtimeService._();

  io.Socket? _socket;

  void connect() {
    final token = DriverSession.accessToken;
    if (token == null || token.isEmpty) {
      return;
    }
    if (_socket != null) {
      return;
    }

    final baseUrl = DriverApi.baseUrl.replaceFirst(RegExp(r'/api/v1$'), '');
    final socket = io.io(
      baseUrl,
      <String, dynamic>{
        'transports': ['websocket', 'polling'],
        'autoConnect': true,
        'reconnection': true,
        'auth': {'token': token},
      },
    );
    socket.onConnectError((error) {
      // Keep UI stable and rely on REST fallback.
      // ignore: avoid_print
      print('Driver realtime connect error: $error');
    });
    _socket = socket;
  }

  void reconnect() {
    disconnect();
    connect();
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }

  void joinChatRoom(String roomId) {
    _socket?.emit('chat:join', {'roomId': roomId});
  }

  void leaveChatRoom(String roomId) {
    _socket?.emit('chat:leave', {'roomId': roomId});
  }

  void onChatMessage(ChatMessageHandler handler) {
    _socket?.on('chat:message', (payload) {
      if (payload is Map) {
        handler(Map<String, dynamic>.from(payload));
      }
    });
  }

  void offChatMessage() {
    _socket?.off('chat:message');
  }

  void onNotification(NotificationHandler handler) {
    _socket?.on('notifications:new', (payload) {
      if (payload is Map) {
        handler(Map<String, dynamic>.from(payload));
      }
    });
    _socket?.on('maintenance:new', (payload) {
      if (payload is Map) {
        handler(Map<String, dynamic>.from(payload));
      }
    });
  }

  void offNotification() {
    _socket?.off('notifications:new');
    _socket?.off('maintenance:new');
  }

  void onFleetUpdate(FleetUpdateHandler handler) {
    _socket?.on('fleet:update', (payload) {
      if (payload is Map) {
        handler(Map<String, dynamic>.from(payload));
      }
    });
  }

  void offFleetUpdate() {
    _socket?.off('fleet:update');
  }
}
