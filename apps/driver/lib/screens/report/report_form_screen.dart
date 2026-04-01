import 'package:flutter/material.dart';

import '../../app_language.dart';
import '../../services/driver_api.dart';

class ReportFormScreen extends StatefulWidget {
  const ReportFormScreen({
    required this.reportTypeKey,
    required this.reportTitle,
    required this.tripId,
    required this.vehicleId,
    required this.driverId,
    super.key,
  });

  final String reportTypeKey;
  final String reportTitle;
  final String tripId;
  final String vehicleId;
  final String driverId;

  @override
  State<ReportFormScreen> createState() => _ReportFormScreenState();
}

class _ReportFormScreenState extends State<ReportFormScreen> {
  final _descriptionController = TextEditingController();
  final _odometerController = TextEditingController(text: '245400');
  final _litersController = TextEditingController(text: '120');
  final _costController = TextEditingController(text: '12600');
  final _stationController = TextEditingController(text: 'Tikur Abay Fuel Station');
  final _expectedDelayController = TextEditingController(text: '2 hours');
  final _checkpointController = TextEditingController(text: 'Galafi Border');
  final _policeReferenceController = TextEditingController();
  final _tirePositionController = TextEditingController(text: 'Rear right');

  String _urgency = 'medium';
  String _severity = 'high';
  String _drivable = 'yes';
  String _injuries = 'no';
  String _issueArea = 'engine';
  String _obstacleType = 'road block';
  String _delayType = 'checkpoint';
  String _breakdownType = 'engine';
  String _attachment = 'photo_${DateTime.now().millisecondsSinceEpoch}.jpg';
  bool _submitting = false;
  String? _error;

  bool get _isFuelLog => widget.reportTypeKey == 'fuel_log';
  bool get _isAccident => widget.reportTypeKey == 'accident_report';
  bool get _isTireIssue => widget.reportTypeKey == 'tire_issue';
  bool get _isMaintenance => widget.reportTypeKey == 'maintenance_needed';
  bool get _isRoadObstacle => widget.reportTypeKey == 'obstacle_report';
  bool get _isDelayReport => widget.reportTypeKey == 'delay_report';
  bool get _isBreakdown => widget.reportTypeKey == 'breakdown_report';
  bool get _isSupportRequest => widget.reportTypeKey == 'support_request';
  bool get _isWorkflowUpdate => {'checkpoint_update', 'border_crossed', 'pod_uploaded'}.contains(widget.reportTypeKey);

  @override
  void dispose() {
    _descriptionController.dispose();
    _odometerController.dispose();
    _litersController.dispose();
    _costController.dispose();
    _stationController.dispose();
    _expectedDelayController.dispose();
    _checkpointController.dispose();
    _policeReferenceController.dispose();
    _tirePositionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.reportTitle)),
      body: ListView(
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
                    widget.reportTitle,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(color: Colors.white, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _reportSubtitle(),
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
                  Text(t('fieldContext', fallback: 'Field context'), style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 12),
                  _ContextTile(label: t('trip', fallback: 'Trip'), value: _safeValue(widget.tripId)),
                  _ContextTile(label: t('assignedVehicle', fallback: 'Assigned vehicle'), value: _safeValue(widget.vehicleId)),
                  _ContextTile(label: t('driver', fallback: 'Driver'), value: _safeValue(widget.driverId)),
                  _ContextTile(label: t('gpsLocation', fallback: 'GPS location'), value: '11.5721, 43.1456 · ${t('autoCaptured', fallback: 'Auto captured')}'),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  TextField(
                    controller: _odometerController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(labelText: t('odometerKm', fallback: 'Odometer KM')),
                  ),
                  if (_isFuelLog) ..._fuelFields(),
                  if (_isAccident) ..._accidentFields(),
                  if (_isTireIssue) ..._tireFields(),
                  if (_isMaintenance) ..._maintenanceFields(),
                  if (_isRoadObstacle) ..._roadObstacleFields(),
                  if (_isDelayReport) ..._delayFields(),
                  if (_isBreakdown) ..._breakdownFields(),
                  if (_isSupportRequest) ..._supportFields(),
                  if (!_isFuelLog && !_isWorkflowUpdate && !_isAccident && !_isTireIssue && !_isMaintenance && !_isRoadObstacle && !_isDelayReport && !_isBreakdown && !_isSupportRequest)
                    ..._genericUrgencyFields(),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _descriptionController,
                    maxLines: 4,
                    decoration: InputDecoration(
                      labelText: _isFuelLog ? t('notes', fallback: 'Notes') : t('descriptionLabel', fallback: 'Description'),
                      hintText: _reportHint(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(_attachmentLabel()),
                    subtitle: Text(_attachment),
                    trailing: FilledButton.tonal(
                      onPressed: _submitting ? null : () => setState(() => _attachment = 'picked_${DateTime.now().millisecondsSinceEpoch}.jpg'),
                      child: Text(t('pick', fallback: 'Pick')),
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 8),
                    Text(_error!, style: const TextStyle(color: Colors.red)),
                  ],
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _submitting ? null : () => Navigator.of(context).pop(false),
                          child: Text(t('saveDraft', fallback: 'Save draft')),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton(
                          onPressed: _submitting ? null : _submit,
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            child: Text(_submitting ? t('submitting', fallback: 'Submitting...') : t('submit', fallback: 'Submit')),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _fuelFields() {
    return [
      const SizedBox(height: 12),
      TextField(
        controller: _litersController,
        keyboardType: TextInputType.number,
        decoration: InputDecoration(labelText: t('liters', fallback: 'Liters')),
      ),
      const SizedBox(height: 12),
      TextField(
        controller: _costController,
        keyboardType: TextInputType.number,
        decoration: InputDecoration(labelText: t('cost', fallback: 'Cost')),
      ),
      const SizedBox(height: 12),
      TextField(
        controller: _stationController,
        decoration: InputDecoration(labelText: t('stationName', fallback: 'Station name')),
      ),
    ];
  }

  List<Widget> _accidentFields() {
    return [
      const SizedBox(height: 12),
      _dropdown(
        label: t('severity', fallback: 'Severity'),
        value: _severity,
        options: const ['medium', 'high', 'critical'],
        onChanged: (value) => setState(() => _severity = value),
      ),
      const SizedBox(height: 12),
      _dropdown(
        label: t('drivable', fallback: 'Drivable'),
        value: _drivable,
        options: const ['yes', 'no'],
        onChanged: (value) => setState(() => _drivable = value),
      ),
      const SizedBox(height: 12),
      _dropdown(
        label: t('injuries', fallback: 'Injuries'),
        value: _injuries,
        options: const ['yes', 'no'],
        onChanged: (value) => setState(() => _injuries = value),
      ),
      const SizedBox(height: 12),
      TextField(
        controller: _policeReferenceController,
        decoration: InputDecoration(labelText: t('policeReference', fallback: 'Police reference')),
      ),
    ];
  }

  List<Widget> _tireFields() {
    return [
      const SizedBox(height: 12),
      TextField(
        controller: _tirePositionController,
        decoration: InputDecoration(labelText: t('tirePosition', fallback: 'Tire position')),
      ),
      const SizedBox(height: 12),
      _dropdown(
        label: t('drivable', fallback: 'Drivable'),
        value: _drivable,
        options: const ['yes', 'no'],
        onChanged: (value) => setState(() => _drivable = value),
      ),
    ];
  }

  List<Widget> _maintenanceFields() {
    return [
      const SizedBox(height: 12),
      _dropdown(
        label: t('issueArea', fallback: 'Issue area'),
        value: _issueArea,
        options: const ['engine', 'brake', 'tire', 'oil', 'electrical', 'suspension', 'other'],
        onChanged: (value) => setState(() => _issueArea = value),
      ),
      const SizedBox(height: 12),
      _dropdown(
        label: t('urgencyLabel', fallback: 'Urgency'),
        value: _urgency,
        options: const ['low', 'medium', 'high', 'critical'],
        onChanged: (value) => setState(() => _urgency = value),
      ),
      const SizedBox(height: 12),
      _dropdown(
        label: t('drivable', fallback: 'Drivable'),
        value: _drivable,
        options: const ['yes', 'no'],
        onChanged: (value) => setState(() => _drivable = value),
      ),
    ];
  }

  List<Widget> _roadObstacleFields() {
    return [
      const SizedBox(height: 12),
      _dropdown(
        label: t('obstacleType', fallback: 'Obstacle type'),
        value: _obstacleType,
        options: const ['traffic', 'road block', 'weather', 'customs delay', 'checkpoint issue'],
        onChanged: (value) => setState(() => _obstacleType = value),
      ),
      const SizedBox(height: 12),
      TextField(
        controller: _expectedDelayController,
        decoration: InputDecoration(labelText: t('expectedDelay', fallback: 'Expected delay')),
      ),
    ];
  }

  List<Widget> _delayFields() {
    return [
      const SizedBox(height: 12),
      _dropdown(
        label: t('delayType', fallback: 'Delay type'),
        value: _delayType,
        options: const ['traffic', 'checkpoint', 'customs', 'loading', 'offloading'],
        onChanged: (value) => setState(() => _delayType = value),
      ),
      const SizedBox(height: 12),
      TextField(
        controller: _expectedDelayController,
        decoration: InputDecoration(labelText: t('expectedDelay', fallback: 'Expected delay')),
      ),
      const SizedBox(height: 12),
      TextField(
        controller: _checkpointController,
        decoration: InputDecoration(labelText: t('checkpoint', fallback: 'Checkpoint')),
      ),
    ];
  }

  List<Widget> _breakdownFields() {
    return [
      const SizedBox(height: 12),
      _dropdown(
        label: t('breakdownType', fallback: 'Breakdown type'),
        value: _breakdownType,
        options: const ['engine', 'electrical', 'tire', 'brake', 'other'],
        onChanged: (value) => setState(() => _breakdownType = value),
      ),
      const SizedBox(height: 12),
      _dropdown(
        label: t('drivable', fallback: 'Drivable'),
        value: _drivable,
        options: const ['yes', 'no'],
        onChanged: (value) => setState(() => _drivable = value),
      ),
      const SizedBox(height: 12),
      _dropdown(
        label: t('towingNeeded', fallback: 'Towing needed'),
        value: _injuries,
        options: const ['yes', 'no'],
        onChanged: (value) => setState(() => _injuries = value),
      ),
    ];
  }

  List<Widget> _supportFields() {
    return [
      const SizedBox(height: 12),
      _dropdown(
        label: t('urgencyLabel', fallback: 'Urgency'),
        value: _urgency,
        options: const ['low', 'medium', 'high'],
        onChanged: (value) => setState(() => _urgency = value),
      ),
    ];
  }

  List<Widget> _genericUrgencyFields() {
    return [
      const SizedBox(height: 12),
      _dropdown(
        label: t('urgencyLabel', fallback: 'Urgency'),
        value: _urgency,
        options: const ['low', 'medium', 'high', 'critical'],
        onChanged: (value) => setState(() => _urgency = value),
      ),
    ];
  }

  Widget _dropdown({
    required String label,
    required String value,
    required List<String> options,
    required ValueChanged<String> onChanged,
  }) {
    return DropdownButtonFormField<String>(
      initialValue: value,
      items: options
          .map((item) => DropdownMenuItem(
                value: item,
                child: Text(_choiceText(item)),
              ))
          .toList(),
      onChanged: _submitting ? null : (selected) => onChanged(selected ?? value),
      decoration: InputDecoration(labelText: label),
    );
  }

  String _attachmentLabel() {
    if (_isFuelLog) return t('receiptAttachment', fallback: 'Receipt / attachment');
    return t('photoAttachment', fallback: 'Photo attachment');
  }

  String _reportHint() {
    if (_isFuelLog) {
      return t('fuelAndReceipts', fallback: 'Fuel, receipt, station, and odometer');
    }
    return t('fieldPackage', fallback: 'Trip, vehicle, driver, GPS, odometer, urgency, and attachments');
  }

  String _reportSubtitle() {
    if (_isFuelLog) return t('fuelAndReceipts', fallback: 'Fuel, receipt, station, and odometer');
    return t('fieldPackage', fallback: 'Trip, vehicle, driver, GPS, odometer, urgency, and attachments');
  }

  String _choiceText(String value) {
    switch (value) {
      case 'low':
        return t('low', fallback: 'Low');
      case 'medium':
        return t('medium', fallback: 'Medium');
      case 'high':
        return t('high', fallback: 'High');
      case 'critical':
        return t('critical', fallback: 'Critical');
      case 'yes':
        return t('yes', fallback: 'Yes');
      case 'no':
        return t('no', fallback: 'No');
      default:
        return value;
    }
  }

  Future<void> _submit() async {
    if (!_isFuelLog && _descriptionController.text.trim().isEmpty) {
      setState(() => _error = t('descriptionRequired', fallback: 'Description is required.'));
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      if (_isFuelLog) {
        await DriverApi.createFuelLog({
          'vehicleId': widget.vehicleId,
          'driverId': widget.driverId,
          'tripId': widget.tripId,
          'liters': double.tryParse(_litersController.text) ?? 0,
          'cost': double.tryParse(_costController.text) ?? 0,
          'odometerKm': int.tryParse(_odometerController.text) ?? 0,
          'station': _stationController.text.trim(),
          'receiptDocumentId': _attachment,
        });
      } else if (_isAccident || _isRoadObstacle || _isBreakdown) {
        await DriverApi.createIncidentReport({
          'type': widget.reportTypeKey,
          'vehicleId': widget.vehicleId,
          'driverId': widget.driverId,
          'tripId': widget.tripId,
          'severity': _isAccident ? _severity : _urgency,
          'location': {'latitude': 11.5721, 'longitude': 43.1456},
          'description': _descriptionController.text.trim(),
          'attachments': [_attachment],
          'status': 'submitted',
        });
      } else if (_isWorkflowUpdate) {
        await DriverApi.createActivityLog({
          'entityType': 'trip',
          'entityId': widget.tripId,
          'tripId': widget.tripId,
          'vehicleId': widget.vehicleId,
          'driverId': widget.driverId,
          'activityType': widget.reportTypeKey,
          'title': widget.reportTitle,
          'description': _descriptionController.text.trim(),
          'metadata': {'attachment': _attachment, 'odometerKm': int.tryParse(_odometerController.text) ?? 0},
        });
      } else {
        await DriverApi.createReport({
          'type': widget.reportTypeKey,
          'tripId': widget.tripId,
          'vehicleId': widget.vehicleId,
          'driverId': widget.driverId,
          'location': '11.5721,43.1456',
          'odometerKm': int.tryParse(_odometerController.text) ?? 0,
          'urgency': _urgency,
          'description': _descriptionController.text.trim(),
          'attachments': [_attachment],
        });
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(t('reportSubmittedSuccessfully', fallback: 'Submission recorded successfully.'))),
      );
      Navigator.of(context).pop(true);
    } catch (_) {
      setState(() => _error = t('submissionError', fallback: 'Submission failed. Review the fields and try again.'));
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }
}

class _ContextTile extends StatelessWidget {
  const _ContextTile({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 120, child: Text(label, style: const TextStyle(color: Colors.black54))),
          Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w600))),
        ],
      ),
    );
  }
}

String _safeValue(String? value) {
  if (value == null || value.trim().isEmpty) return t('notAvailable', fallback: 'Not available');
  return value;
}
