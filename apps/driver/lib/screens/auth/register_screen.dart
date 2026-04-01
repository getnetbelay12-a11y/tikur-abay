import 'package:flutter/material.dart';

import '../../app_language.dart';
import '../../navigation/app_flow_navigator.dart';
import '../../services/demo_field_defaults.dart';
import '../../services/driver_api.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _fullNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _companyController = TextEditingController();
  final _tradeLicenseController = TextEditingController();
  final _tinController = TextEditingController();
  final _vatController = TextEditingController();
  final _addressController = TextEditingController();
  final _faydaFrontController = TextEditingController();
  final _faydaBackController = TextEditingController();
  final _selfieController = TextEditingController();
  final _licenseController = TextEditingController();
  final _emergencyContactController = TextEditingController();
  final _branchController = TextEditingController();
  final _partnerCompanyController = TextEditingController();
  final _partnerVehicleCodeController = TextEditingController();
  late final DemoFieldDefaults _demoDefaults;

  String _role = 'customer';
  String _driverType = 'internal_driver';
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _demoDefaults = DemoFieldDefaults.generate(roleLabel: 'register');
    _fullNameController.text = _demoDefaults.fullName;
    _phoneController.text = _demoDefaults.phone;
    _emailController.text = _demoDefaults.email;
    _companyController.text = _demoDefaults.companyName;
    _addressController.text = _demoDefaults.city;
    _emergencyContactController.text = _demoDefaults.emergencyName;
    _branchController.text = _demoDefaults.branch;
    _partnerCompanyController.text = _demoDefaults.partnerCompany;
    _licenseController.text = _demoDefaults.licenseNumber;
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _companyController.dispose();
    _tradeLicenseController.dispose();
    _tinController.dispose();
    _vatController.dispose();
    _addressController.dispose();
    _faydaFrontController.dispose();
    _faydaBackController.dispose();
    _selfieController.dispose();
    _licenseController.dispose();
    _emergencyContactController.dispose();
    _branchController.dispose();
    _partnerCompanyController.dispose();
    _partnerVehicleCodeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDriver = _role == 'driver';
    final isExternal = isDriver && _driverType == 'external_driver';

    return Scaffold(
      appBar: AppBar(title: Text(t('register', fallback: 'Register'))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(t('roleSelection', fallback: 'Choose your role'),
                      style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 16),
                  SegmentedButton<String>(
                    segments: [
                      ButtonSegment(
                          value: 'customer',
                          label: Text(t('customerBusinessUser',
                              fallback: 'Customer / Business User'))),
                      ButtonSegment(
                          value: 'driver',
                          label: Text(t('driverRole', fallback: 'Driver'))),
                    ],
                    selected: {_role},
                    onSelectionChanged: (value) =>
                        setState(() => _role = value.first),
                  ),
                  if (isDriver) ...[
                    const SizedBox(height: 16),
                    Text(t('driverType', fallback: 'Driver type'),
                        style: Theme.of(context).textTheme.titleSmall),
                    const SizedBox(height: 8),
                    SegmentedButton<String>(
                      segments: [
                        ButtonSegment(
                            value: 'internal_driver',
                            label: Text(t('internalDriver',
                                fallback: 'Internal driver'))),
                        ButtonSegment(
                            value: 'external_driver',
                            label: Text(t('externalDriver',
                                fallback: 'External partner driver'))),
                      ],
                      selected: {_driverType},
                      onSelectionChanged: (value) =>
                          setState(() => _driverType = value.first),
                    ),
                  ],
                  const SizedBox(height: 20),
                  _field(_fullNameController,
                      t('fullName', fallback: 'Full name')),
                  const SizedBox(height: 12),
                  _field(_phoneController,
                      t('phoneNumber', fallback: 'Phone number')),
                  const SizedBox(height: 12),
                  _field(_emailController, t('email', fallback: 'Email')),
                  const SizedBox(height: 12),
                  _field(
                      _passwordController, t('password', fallback: 'Password'),
                      obscure: true),
                  const SizedBox(height: 12),
                  if (!isDriver) ...[
                    _field(_companyController,
                        t('companyName', fallback: 'Company name')),
                    const SizedBox(height: 12),
                    _field(_tradeLicenseController,
                        t('tradeLicense', fallback: 'Trade license')),
                    const SizedBox(height: 12),
                    _field(_tinController, t('tin', fallback: 'TIN')),
                    const SizedBox(height: 12),
                    _field(_vatController, t('vat', fallback: 'VAT')),
                    const SizedBox(height: 12),
                    _field(
                        _addressController, t('address', fallback: 'Address')),
                  ],
                  if (isDriver) ...[
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF3F6FA),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                              t('driverKycRequired',
                                  fallback: 'Driver KYC required'),
                              style:
                                  const TextStyle(fontWeight: FontWeight.w700)),
                          const SizedBox(height: 6),
                          Text(t('driverKycHelp',
                              fallback:
                                  'Submit Fayda front and back, phone, and license details. Driver actions unlock after HR or operations approval.')),
                          const SizedBox(height: 8),
                          Text(
                              '${t('driverKycLifecycle', fallback: 'KYC lifecycle')}: ${t('driverKycLifecycleValue', fallback: 'draft → submitted → under review → approved / rejected / suspended')}'),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    _field(_faydaFrontController,
                        t('faydaFront', fallback: 'Fayda front document ID')),
                    const SizedBox(height: 12),
                    _field(_faydaBackController,
                        t('faydaBack', fallback: 'Fayda back document ID')),
                    const SizedBox(height: 12),
                    _field(_licenseController,
                        t('driverLicense', fallback: 'Driver license')),
                    const SizedBox(height: 12),
                    _field(
                        _emergencyContactController,
                        t('emergencyContactName',
                            fallback: 'Emergency contact')),
                    const SizedBox(height: 12),
                    _field(_branchController,
                        t('branchId', fallback: 'Branch ID')),
                    const SizedBox(height: 12),
                    _field(_selfieController,
                        t('selfieDocument', fallback: 'Selfie document ID')),
                    if (isExternal) ...[
                      const SizedBox(height: 12),
                      _field(_partnerCompanyController,
                          t('partnerCompany', fallback: 'Partner company')),
                      const SizedBox(height: 12),
                      _field(
                          _partnerVehicleCodeController,
                          t('partnerVehicleCode',
                              fallback: 'Partner vehicle / mapping code')),
                    ],
                  ],
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text(_error!, style: const TextStyle(color: Colors.red)),
                  ],
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _loading ? null : _submit,
                      child: Text(_loading
                          ? t('creatingAccount',
                              fallback: 'Creating account...')
                          : t('createAccount', fallback: 'Create account')),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _field(TextEditingController controller, String label,
      {bool obscure = false}) {
    return TextField(
      controller: controller,
      obscureText: obscure,
      decoration: InputDecoration(labelText: label),
    );
  }

  Future<void> _submit() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      if (_role == 'driver') {
        if (_faydaFrontController.text.trim().isEmpty) {
          throw Exception('Fayda front document ID is required.');
        }
        if (_faydaBackController.text.trim().isEmpty) {
          throw Exception('Fayda back document ID is required.');
        }
        if (_licenseController.text.trim().isEmpty) {
          throw Exception('Driver license is required.');
        }
        if (_driverType == 'external_driver' &&
            _partnerCompanyController.text.trim().isEmpty) {
          throw Exception('Partner company is required for external drivers.');
        }
      }

      await DriverApi.register({
        'fullName': _fullNameController.text.trim(),
        'phone': _phoneController.text.trim(),
        'email': _emailController.text.trim().isEmpty
            ? null
            : _emailController.text.trim(),
        'password': _passwordController.text,
        'role': _role,
        'mobileRole': _role == 'customer' ? 'customer' : _driverType,
        'companyName': _companyController.text.trim().isEmpty
            ? null
            : _companyController.text.trim(),
        'tradeLicense': _tradeLicenseController.text.trim().isEmpty
            ? null
            : _tradeLicenseController.text.trim(),
        'tin': _tinController.text.trim().isEmpty
            ? null
            : _tinController.text.trim(),
        'vat': _vatController.text.trim().isEmpty
            ? null
            : _vatController.text.trim(),
        'address': _addressController.text.trim().isEmpty
            ? null
            : _addressController.text.trim(),
        'faydaFrontDocumentId':
            _role == 'driver' ? _faydaFrontController.text.trim() : null,
        'faydaBackDocumentId':
            _role == 'driver' ? _faydaBackController.text.trim() : null,
        'selfieDocumentId': _role == 'driver'
            ? (_selfieController.text.trim().isEmpty
                ? null
                : _selfieController.text.trim())
            : null,
        'licenseNumber':
            _role == 'driver' ? _licenseController.text.trim() : null,
        'emergencyContact': _role == 'driver'
            ? (_emergencyContactController.text.trim().isEmpty
                ? null
                : _emergencyContactController.text.trim())
            : null,
        'branchId': _role == 'driver'
            ? (_branchController.text.trim().isEmpty
                ? null
                : _branchController.text.trim())
            : null,
        'partnerCompany': _role == 'driver' && _driverType == 'external_driver'
            ? (_partnerCompanyController.text.trim().isEmpty
                ? null
                : _partnerCompanyController.text.trim())
            : null,
        'partnerVehicleCode':
            _role == 'driver' && _driverType == 'external_driver'
                ? (_partnerVehicleCodeController.text.trim().isEmpty
                    ? null
                    : _partnerVehicleCodeController.text.trim())
                : null,
      });

      await setDriverLanguage(driverLanguageNotifier.value);
      if (!mounted) return;
      await AppFlowNavigator.resetToRoleHome(
        context,
        role: _role == 'customer' ? 'customer' : _driverType,
        kycStatus: _role == 'driver' ? 'submitted' : null,
      );
    } catch (error) {
      setState(() => _error = error
          .toString()
          .replaceFirst('Exception: ', '')
          .replaceFirst('HttpException: ', ''));
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }
}
