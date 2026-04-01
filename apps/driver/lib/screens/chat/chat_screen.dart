import 'dart:async';

import 'package:flutter/material.dart';

import '../../services/driver_api.dart';
import '../../services/realtime_service.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _composer = TextEditingController();
  List<Map<String, dynamic>> _rooms = const [];
  List<Map<String, dynamic>> _messages = const [];
  String _selectedRoomId = '';
  bool _loading = true;
  bool _sending = false;
  String _error = '';

  @override
  void initState() {
    super.initState();
    DriverRealtimeService.instance.connect();
    DriverRealtimeService.instance.onChatMessage(_handleRealtimeMessage);
    _loadRooms();
  }

  @override
  void dispose() {
    _composer.dispose();
    DriverRealtimeService.instance.offChatMessage();
    if (_selectedRoomId.isNotEmpty) {
      DriverRealtimeService.instance.leaveChatRoom(_selectedRoomId);
    }
    super.dispose();
  }

  Future<void> _loadRooms() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final rooms = await DriverApi.fetchChatRooms();
      final mapped = rooms
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList();
      final nextRoomId = _selectedRoomId.isNotEmpty
          ? _selectedRoomId
          : (mapped.isNotEmpty ? mapped.first['id']?.toString() ?? '' : '');
      setState(() {
        _rooms = mapped;
        _selectedRoomId = nextRoomId;
      });
      if (nextRoomId.isNotEmpty) {
        await _loadMessages(nextRoomId);
      }
    } catch (_) {
      setState(() {
        _error = 'Unable to load chat rooms right now.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<void> _loadMessages(String roomId) async {
    try {
      if (_selectedRoomId.isNotEmpty && _selectedRoomId != roomId) {
        DriverRealtimeService.instance.leaveChatRoom(_selectedRoomId);
      }
      DriverRealtimeService.instance.joinChatRoom(roomId);
      final response = await DriverApi.fetchChatMessages(roomId);
      final items = (response['items'] as List<dynamic>? ?? const [])
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList();
      await DriverApi.markChatRead(roomId);
      if (!mounted) return;
      setState(() {
        _selectedRoomId = roomId;
        _messages = items;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Unable to load chat messages right now.';
      });
    }
  }

  Future<void> _send() async {
    final roomId = _selectedRoomId;
    final text = _composer.text.trim();
    if (roomId.isEmpty || text.isEmpty) {
      setState(() {
        _error = 'Message cannot be empty.';
      });
      return;
    }
    setState(() {
      _sending = true;
      _error = '';
    });
    try {
      final sent = await DriverApi.sendChatMessage(roomId, text);
      if (!mounted) return;
      setState(() {
        _composer.clear();
        _messages = [..._messages, sent];
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Unable to send the message right now.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _sending = false;
        });
      }
    }
  }

  void _handleRealtimeMessage(Map<String, dynamic> payload) {
    final roomId = payload['roomId']?.toString() ?? '';
    if (roomId.isEmpty) return;
    if (_rooms.every((room) => room['id']?.toString() != roomId)) {
      unawaited(_loadRooms());
    }
    if (roomId != _selectedRoomId) return;
    if (!mounted) return;
    setState(() {
      if (_messages.any((message) => message['id']?.toString() == payload['id']?.toString())) {
        return;
      }
      _messages = [..._messages, payload];
    });
  }

  @override
  Widget build(BuildContext context) {
    final selectedRoom = _rooms.cast<Map<String, dynamic>?>().firstWhere(
          (room) => room?['id']?.toString() == _selectedRoomId,
          orElse: () => _rooms.isNotEmpty ? _rooms.first : null,
        );

    return Row(
      children: [
        SizedBox(
          width: 220,
          child: Card(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : ListView(
                    padding: const EdgeInsets.all(12),
                    children: [
                      const Text(
                        'Rooms',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 12),
                      if (_rooms.isEmpty)
                        const Text(
                          'No chat room is available yet.',
                          style: TextStyle(color: Color(0xFF5B677A)),
                        ),
                      ..._rooms.map(
                        (room) => Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: FilledButton.tonal(
                            onPressed: () => _loadMessages(room['id']?.toString() ?? ''),
                            style: FilledButton.styleFrom(
                              alignment: Alignment.centerLeft,
                              backgroundColor:
                                  room['id']?.toString() == _selectedRoomId
                                      ? const Color(0xFFDCE9FF)
                                      : null,
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  room['title']?.toString() ?? 'Chat room',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  room['roomType']?.toString() ?? 'room',
                                  style: const TextStyle(fontSize: 11),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    selectedRoom?['title']?.toString() ?? 'Live chat',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    selectedRoom?['description']?.toString() ??
                        'Shipment, dispatch, support, and coordination messages.',
                    style: const TextStyle(color: Color(0xFF5B677A)),
                  ),
                  const SizedBox(height: 14),
                  Expanded(
                    child: _messages.isEmpty
                        ? const Center(
                            child: Text(
                              'No message yet in this room.',
                              style: TextStyle(color: Color(0xFF5B677A)),
                            ),
                          )
                        : ListView.separated(
                            itemCount: _messages.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 10),
                            itemBuilder: (context, index) {
                              final message = _messages[index];
                              final own = message['ownMessage'] == true;
                              return Align(
                                alignment: own
                                    ? Alignment.centerRight
                                    : Alignment.centerLeft,
                                child: Container(
                                  constraints:
                                      const BoxConstraints(maxWidth: 420),
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: own
                                        ? const Color(0xFFDCE9FF)
                                        : const Color(0xFFF8FAFC),
                                    borderRadius: BorderRadius.circular(14),
                                  ),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        message['senderName']?.toString() ??
                                            'System',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        message['content']?.toString() ??
                                            message['text']?.toString() ??
                                            '',
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        message['createdAt']?.toString() ?? '',
                                        style: const TextStyle(
                                          color: Color(0xFF5B677A),
                                          fontSize: 11,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
                  if (_error.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      _error,
                      style: const TextStyle(
                        color: Color(0xFFB42318),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _composer,
                          decoration: const InputDecoration(
                            hintText: 'Write a message',
                            border: OutlineInputBorder(),
                          ),
                          minLines: 1,
                          maxLines: 4,
                        ),
                      ),
                      const SizedBox(width: 12),
                      FilledButton(
                        onPressed: _sending ? null : _send,
                        child: Text(_sending ? 'Sending...' : 'Send'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
