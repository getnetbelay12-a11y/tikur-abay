import 'package:flutter/material.dart';

import '../../navigation/app_flow_navigator.dart';
import '../../services/driver_api.dart';

class DriverKycUploadScreen extends StatefulWidget {
  const DriverKycUploadScreen({required this.role, super.key});

  final String role;

  @override
  State<DriverKycUploadScreen> createState() => _DriverKycUploadScreenState();
}

class _DriverKycUploadScreenState extends State<DriverKycUploadScreen> {
  bool _frontUploaded = false;
  bool _backUploaded = false;
  bool _licenseUploaded = false;
  bool _selfieUploaded = false;
  bool _submitting = false;

  Future<void> _submit() async {
    if (!(_frontUploaded && _backUploaded && _licenseUploaded)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text(
                'Upload Fayda front, Fayda back, and driver license first.')),
      );
      return;
    }

    setState(() => _submitting = true);
    final user =
        Map<String, dynamic>.from(DriverSession.user ?? <String, dynamic>{});
    user['kycStatus'] = 'submitted';
    user['faydaFrontStatus'] = 'Uploaded';
    user['faydaBackStatus'] = 'Uploaded';
    user['licenseDocumentStatus'] = 'Uploaded';
    user['selfieStatus'] = _selfieUploaded ? 'Uploaded' : 'Optional';
    await DriverApi.persistSession(
      accessToken: DriverSession.accessToken,
      refreshToken: DriverSession.refreshToken,
      user: user,
    );
    if (!mounted) return;
    setState(() => _submitting = false);
    await AppFlowNavigator.resetToRoleHome(
      context,
      role: widget.role,
      kycStatus: 'submitted',
    );
  }

  Widget _uploadCard({
    required String title,
    required String helper,
    required bool value,
    required ValueChanged<bool> onChanged,
    bool optional = false,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(
              value ? Icons.check_circle_rounded : Icons.upload_file_outlined,
              color: value ? const Color(0xFF0F9D58) : const Color(0xFF16324D),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: const TextStyle(
                          fontSize: 15, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text(helper,
                      style: const TextStyle(
                          fontSize: 12, color: Color(0xFF5B677A))),
                ],
              ),
            ),
            TextButton(
              onPressed: () => onChanged(!value),
              child: Text(value
                  ? 'Uploaded'
                  : optional
                      ? 'Upload optional'
                      : 'Upload'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Driver KYC Upload')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Complete driver KYC',
                      style:
                          TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 8),
                  Text(
                    widget.role == 'external_driver'
                        ? 'External drivers must upload identity and license documents before trip access is reviewed.'
                        : 'Internal drivers must upload identity and license documents before trip operations unlock.',
                    style:
                        const TextStyle(fontSize: 14, color: Color(0xFF5B677A)),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          _uploadCard(
            title: 'Fayda ID front',
            helper: 'Required for driver identity verification.',
            value: _frontUploaded,
            onChanged: (value) => setState(() => _frontUploaded = value),
          ),
          _uploadCard(
            title: 'Fayda ID back',
            helper: 'Required for full KYC review.',
            value: _backUploaded,
            onChanged: (value) => setState(() => _backUploaded = value),
          ),
          _uploadCard(
            title: 'Driver license',
            helper: 'Required before any trip workflow can open.',
            value: _licenseUploaded,
            onChanged: (value) => setState(() => _licenseUploaded = value),
          ),
          _uploadCard(
            title: 'Selfie or extra document',
            helper: 'Optional supporting document for review.',
            value: _selfieUploaded,
            optional: true,
            onChanged: (value) => setState(() => _selfieUploaded = value),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text('Review outcomes',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  SizedBox(height: 8),
                  Text('Pending: files uploaded and waiting to be checked.',
                      style: TextStyle(fontSize: 13, color: Color(0xFF5B677A))),
                  SizedBox(height: 6),
                  Text(
                      'Under review: operations is checking your identity and license.',
                      style: TextStyle(fontSize: 13, color: Color(0xFF5B677A))),
                  SizedBox(height: 6),
                  Text('Approved: full trip and transit tools unlock.',
                      style: TextStyle(fontSize: 13, color: Color(0xFF5B677A))),
                  SizedBox(height: 6),
                  Text('Rejected: resubmit the missing or incorrect files.',
                      style: TextStyle(fontSize: 13, color: Color(0xFF5B677A))),
                ],
              ),
            ),
          ),
          const SizedBox(height: 18),
          FilledButton(
            onPressed: _submitting ? null : _submit,
            child:
                Text(_submitting ? 'Submitting KYC...' : 'Submit for review'),
          ),
        ],
      ),
    );
  }
}
