import 'package:flutter/material.dart';

import '../../app_language.dart';
import '../../services/dashboard_experience.dart';
import '../../services/driver_api.dart';

enum CustomerBookMode { availability, booking }

class CustomerBookScreen extends StatefulWidget {
  const CustomerBookScreen({this.mode = CustomerBookMode.booking, super.key});

  final CustomerBookMode mode;

  @override
  State<CustomerBookScreen> createState() => _CustomerBookScreenState();
}

class _CustomerBookScreenState extends State<CustomerBookScreen> {
  final _originController = TextEditingController(text: 'Addis Ababa');
  final _destinationController = TextEditingController(text: 'Djibouti');
  final _cargoController =
      TextEditingController(text: 'Containerized dry cargo');
  final _weightController = TextEditingController(text: '28');
  final _volumeController = TextEditingController(text: '42');
  final _notesController = TextEditingController();

  DateTime? _requestedDate = DateTime.now().add(const Duration(days: 1));
  String _vehicleType = 'Truck';
  bool _submittingQuote = false;
  bool _submittingBooking = false;
  late Future<List<dynamic>> _availabilityFuture;

  static const List<Map<String, dynamic>> _fallbackAvailability = [
    {
      'vehicleCode': 'TRK-2401',
      'type': 'Truck',
      'availableCount': 4,
      'route': 'Addis Ababa - Djibouti',
      'branchName': 'Addis Ababa HQ',
      'currentStatus': 'available',
    },
    {
      'vehicleCode': 'TRL-1810',
      'type': 'Trailer',
      'availableCount': 2,
      'route': 'Addis Ababa - Modjo',
      'branchName': 'Addis Ababa HQ',
      'currentStatus': 'available',
    },
    {
      'vehicleCode': 'FLT-3320',
      'type': 'Flatbed',
      'availableCount': 1,
      'route': 'Adama - Djibouti',
      'branchName': 'Adama',
      'currentStatus': 'reserved',
    },
  ];

  @override
  void initState() {
    super.initState();
    _availabilityFuture = DriverApi.fetchAvailableFleet();
  }

  @override
  void dispose() {
    _originController.dispose();
    _destinationController.dispose();
    _cargoController.dispose();
    _weightController.dispose();
    _volumeController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final selected = await showDatePicker(
      context: context,
      initialDate: _requestedDate ?? DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (selected != null) {
      setState(() => _requestedDate = selected);
    }
  }

  Future<void> _reload() async {
    setState(() {
      _availabilityFuture = DriverApi.fetchAvailableFleet();
    });
  }

  Future<void> _submitQuote() async {
    setState(() => _submittingQuote = true);
    try {
      await DriverApi.requestQuote(_payload());
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(t('requestQuoteAction', fallback: 'Request quote'))),
      );
    } finally {
      if (mounted) setState(() => _submittingQuote = false);
    }
  }

  Future<void> _submitBooking() async {
    setState(() => _submittingBooking = true);
    try {
      await DriverApi.createBooking(_payload());
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(t('reserveAction', fallback: 'Reserve'))),
      );
    } finally {
      if (mounted) setState(() => _submittingBooking = false);
    }
  }

  Map<String, dynamic> _payload() {
    return {
      'route':
          '${_originController.text.trim()} - ${_destinationController.text.trim()}',
      'cargoType': _cargoController.text.trim(),
      'requestedVehicleType': _vehicleType.toLowerCase(),
      'requestedDate': _requestedDate?.toIso8601String(),
      'weight': _weightController.text.trim(),
      'volume': _volumeController.text.trim(),
      'notes': _notesController.text.trim(),
    };
  }

  int get _quoteEstimate {
    final weight = double.tryParse(_weightController.text.trim()) ?? 0;
    final volume = double.tryParse(_volumeController.text.trim()) ?? 0;
    final vehicleBase =
        _vehicleType == 'Truck' ? 92000 : _vehicleType == 'Trailer' ? 118000 : 134000;
    final routeBase = _destinationController.text.toLowerCase().contains('djibouti') ? 28000 : 17000;
    final weightFactor = (weight * 420).round();
    final volumeFactor = (volume * 260).round();
    return vehicleBase + routeBase + weightFactor + volumeFactor;
  }

  String get _normalizedRequestedVehicleType => _vehicleType.toLowerCase();

  bool _matchesVehicleType(Map<String, dynamic> item) {
    final type = (item['type'] ?? item['vehicleType'] ?? '')
        .toString()
        .trim()
        .toLowerCase();
    if (type.isEmpty) return true;
    if (_normalizedRequestedVehicleType == 'truck') {
      return type.contains('truck');
    }
    if (_normalizedRequestedVehicleType == 'trailer') {
      return type.contains('trailer');
    }
    if (_normalizedRequestedVehicleType == 'flatbed') {
      return type.contains('flatbed');
    }
    return true;
  }

  bool _matchesRoute(Map<String, dynamic> item) {
    final origin = _originController.text.trim().toLowerCase();
    final destination = _destinationController.text.trim().toLowerCase();
    if (origin.isEmpty && destination.isEmpty) return true;

    final routeText =
        '${item['route'] ?? ''} ${item['routeName'] ?? ''} ${item['location'] ?? ''} ${item['branchName'] ?? ''}'
            .toLowerCase();
    final matchesOrigin = origin.isEmpty || routeText.contains(origin);
    final matchesDestination =
        destination.isEmpty || routeText.contains(destination);
    return matchesOrigin || matchesDestination;
  }

  List<Map<String, dynamic>> _filteredAvailability(List<dynamic> rawItems) {
    return rawItems
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item.cast<dynamic, dynamic>()))
        .where((item) {
          final status = (item['currentStatus'] ?? item['status'] ?? '')
              .toString()
              .trim()
              .toLowerCase();
          if (status == 'blocked' ||
              status == 'under_maintenance' ||
              status == 'breakdown') {
            return false;
          }
          return _matchesVehicleType(item) && _matchesRoute(item);
        })
        .take(8)
        .toList();
  }

  Widget _buildAvailabilityContent({
    required List<dynamic> availability,
    required bool loadFailed,
  }) {
    final filtered = _filteredAvailability(availability);

    return RefreshIndicator(
      onRefresh: _reload,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            color: const Color(0xFF15304A),
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    t('availabilityWorkspace',
                        fallback: 'Availability workspace'),
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    loadFailed
                        ? 'Live fleet availability is unavailable right now. Fallback vehicle options are shown so booking intake can continue.'
                        : t('availabilitySubtitle',
                            fallback:
                                'Search lanes, capacity, and vehicle fit before sending a quote or booking request.'),
                    style: const TextStyle(color: Colors.white70, height: 1.4),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                      controller: _originController,
                      decoration: InputDecoration(
                          labelText: t('origin', fallback: 'Origin'))),
                  const SizedBox(height: 12),
                  TextField(
                      controller: _destinationController,
                      decoration: InputDecoration(
                          labelText:
                              t('destination', fallback: 'Destination'))),
                  const SizedBox(height: 12),
                  TextField(
                      controller: _cargoController,
                      decoration: InputDecoration(
                          labelText: t('cargoType', fallback: 'Cargo type'))),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _weightController,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                              labelText: t('weight', fallback: 'Weight')),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: _volumeController,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                              labelText: t('volume', fallback: 'Volume')),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: _vehicleType,
                    decoration: InputDecoration(
                        labelText: t('vehicleType', fallback: 'Vehicle type')),
                    items: const ['Truck', 'Trailer', 'Flatbed']
                        .map((item) =>
                            DropdownMenuItem(value: item, child: Text(item)))
                        .toList(),
                    onChanged: (value) =>
                        setState(() => _vehicleType = value ?? 'Truck'),
                  ),
                  const SizedBox(height: 12),
                  InkWell(
                    onTap: _pickDate,
                    child: InputDecorator(
                      decoration: InputDecoration(
                          labelText:
                              t('requestedDate', fallback: 'Requested date')),
                      child: Text(_requestedDate == null
                          ? t('selectDate', fallback: 'Select date')
                          : _formatDate(_requestedDate!)),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _notesController,
                    maxLines: 3,
                    decoration: InputDecoration(
                        labelText: t('specialInstructions',
                            fallback: 'Special instructions')),
                  ),
                  const SizedBox(height: 16),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF5F8FC),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFD7E1EE)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Indicative quote',
                          style: TextStyle(fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 4),
                        Text('ETB ${_quoteEstimate.toString()}'),
                        const SizedBox(height: 4),
                        const Text(
                          'Enter the shipment details once, review the estimated price, then request the quote or book the shipment.',
                          style: TextStyle(color: Color(0xFF607089), height: 1.35),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  widget.mode == CustomerBookMode.booking
                      ? Row(
                          children: [
                            Expanded(
                              child: FilledButton(
                                onPressed:
                                    _submittingQuote ? null : _submitQuote,
                                child: Text(_submittingQuote
                                    ? t('submitting', fallback: 'Submitting...')
                                    : t('requestQuoteAction',
                                        fallback: 'Request quote')),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: FilledButton.tonal(
                                onPressed:
                                    _submittingBooking ? null : _submitBooking,
                                child: Text(_submittingBooking
                                    ? t('submitting', fallback: 'Submitting...')
                                    : 'Book shipment'),
                              ),
                            ),
                          ],
                        )
                      : SizedBox(
                          width: double.infinity,
                          child: FilledButton.tonalIcon(
                            onPressed: _reload,
                            icon: const Icon(Icons.refresh),
                            label: Text(t('checkAvailability',
                                fallback: 'Check availability')),
                          ),
                        ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          _GuideCard(),
          const SizedBox(height: 16),
          Card(
            child: ListTile(
              contentPadding: const EdgeInsets.all(16),
              leading: const Icon(Icons.auto_awesome_outlined),
              title: Text(t('aiRecommendation', fallback: 'AI recommendation')),
              subtitle: Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  DashboardExperience.customerAvailabilityRecommendation(
                    vehicleType: _vehicleType,
                    topLane: filtered.isEmpty
                        ? null
                        : _formatText(filtered.first['route'] ??
                            filtered.first['routeName']),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            t('availabilityResults', fallback: 'Availability results'),
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 10),
          if (filtered.isEmpty)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Text(
                  loadFailed
                      ? 'No live fleet rows matched the current filters. Adjust the lane or use the fallback vehicles listed after refresh.'
                      : t('noActivity', fallback: 'No activity found yet.'),
                ),
              ),
            )
          else
            ...filtered.map((item) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _AvailabilityCard(
                    item: item,
                    mode: widget.mode,
                    onQuote: _submitQuote,
                    onReserve: _submitBooking,
                  ),
                )),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<dynamic>>(
      future: _availabilityFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          return _buildAvailabilityContent(
            availability: _fallbackAvailability,
            loadFailed: true,
          );
        }

        return _buildAvailabilityContent(
          availability: snapshot.data ?? const [],
          loadFailed: false,
        );
      },
    );
  }
}

class _GuideCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(t('bookingGuide', fallback: 'Booking guide'),
                style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Text(t('bookingGuideQuote',
                fallback:
                    'Use Request quote when pricing or vehicle fit still needs approval.')),
            const SizedBox(height: 6),
            Text(t('bookingGuideReserve',
                fallback:
                    'Use Book shipment when the price is acceptable and operations can start the shipment flow.')),
          ],
        ),
      ),
    );
  }
}

class _AvailabilityCard extends StatelessWidget {
  const _AvailabilityCard({
    required this.item,
    required this.mode,
    required this.onQuote,
    required this.onReserve,
  });

  final Map<String, dynamic> item;
  final CustomerBookMode mode;
  final VoidCallback onQuote;
  final VoidCallback onReserve;

  @override
  Widget build(BuildContext context) {
    final branch = _formatText(item['branchName'] ?? item['branch']);
    final location = _formatText(item['location'], fallback: branch);
    final vehicleType = _formatText(item['type'] ?? item['vehicleType'],
        fallback: t('vehicleType', fallback: 'Vehicle type'));
    final vehicleCode = _formatText(item['vehicleCode'], fallback: vehicleType);
    final availableCount = item['availableCount']?.toString() ?? '1';
    final route =
        _formatText(item['route'] ?? item['routeName'], fallback: location);
    final liveStatus = _formatText(item['currentStatus'] ?? item['status'],
        fallback: t('available', fallback: 'Available'));

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(vehicleCode,
                          style: const TextStyle(
                              fontWeight: FontWeight.w700, fontSize: 16)),
                      const SizedBox(height: 2),
                      Text(vehicleType,
                          style: const TextStyle(color: Color(0xFF607089))),
                    ],
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE8EEF5),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                      '${t('availableUnits', fallback: 'Available units')}: $availableCount'),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text('${t('lane', fallback: 'Lane')}: $route'),
            const SizedBox(height: 6),
            Text(
                '${t('estimatedPriceRange', fallback: 'Estimated price range')}: ETB 92,000 - 148,000'),
            const SizedBox(height: 6),
            Text(
                '${t('transitExpectation', fallback: 'Transit expectation')}: 2-4 days'),
            const SizedBox(height: 6),
            Text('${t('branch', fallback: 'Branch')}: $branch'),
            const SizedBox(height: 6),
            Text('${t('status', fallback: 'Status')}: $liveStatus'),
            const SizedBox(height: 14),
            mode == CustomerBookMode.booking
                ? Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: onQuote,
                          child: Text(t('requestQuoteAction',
                              fallback: 'Request quote')),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton(
                          onPressed: onReserve,
                          child: const Text('Book shipment'),
                        ),
                      ),
                    ],
                  )
                : SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: onQuote,
                      child: Text(
                          t('requestQuoteAction', fallback: 'Request quote')),
                    ),
                  ),
          ],
        ),
      ),
    );
  }
}

String _formatText(Object? value, {String? fallback}) {
  final text = value?.toString().trim();
  if (text == null || text.isEmpty || text == 'undefined' || text == 'null') {
    return fallback ?? t('notAvailable', fallback: 'Not available');
  }
  return text;
}

String _formatDate(DateTime value) =>
    '${value.year}-${value.month.toString().padLeft(2, '0')}-${value.day.toString().padLeft(2, '0')}';
