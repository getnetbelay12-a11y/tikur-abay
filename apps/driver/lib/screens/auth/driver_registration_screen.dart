import 'dart:io';

import 'package:flutter/material.dart';

import '../../app_language.dart';
import '../../navigation/app_flow_navigator.dart';
import '../../services/driver_api.dart';
import '../../services/mobile_auth_service.dart';
import 'auth_content.dart';
import 'auth_widgets.dart';

class DriverRegistrationScreen extends StatefulWidget {
  const DriverRegistrationScreen({required this.identifier, super.key});

  final String identifier;

  @override
  State<DriverRegistrationScreen> createState() =>
      _DriverRegistrationScreenState();
}

class _DriverRegistrationScreenState extends State<DriverRegistrationScreen> {
  final _phoneNumber = TextEditingController();
  final _fullName = TextEditingController();
  final _partnerCompany = TextEditingController();
  final _branch = TextEditingController();
  final _emergencyContact = TextEditingController();
  final _licenseNumber = TextEditingController();
  final _password = TextEditingController();

  String _driverType = 'internal_driver';
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _phoneNumber.text = widget.identifier;
  }

  @override
  void dispose() {
    _phoneNumber.dispose();
    _fullName.dispose();
    _partnerCompany.dispose();
    _branch.dispose();
    _emergencyContact.dispose();
    _licenseNumber.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final validation = AuthRules.validateDriverOnboarding(
      fullName: _fullName.text,
      branch: _branch.text,
      isExternal: _driverType == 'external_driver',
      partnerCompany: _partnerCompany.text,
    );
    if (validation != null) {
      AuthFeedback.showMessage(context, validation);
      return;
    }
    final phoneValidation = AuthRules.validateDriverPhone(_phoneNumber.text);
    if (phoneValidation != null) {
      AuthFeedback.showMessage(context, phoneValidation);
      return;
    }
    final passwordValidation = AuthRules.validatePassword(_password.text);
    if (passwordValidation != null) {
      AuthFeedback.showMessage(context, passwordValidation);
      return;
    }

    setState(() => _loading = true);
    try {
      final res = await MobileAuthService.registerDriver(
        identifier: _phoneNumber.text.trim(),
        fullName: _fullName.text.trim(),
        driverType: _driverType,
        password: _password.text.trim(),
        partnerCompanyId: _driverType == 'external_driver'
            ? _partnerCompany.text.trim()
            : null,
        branchId: _branch.text.trim(),
        emergencyContactName: null,
        emergencyContactPhone: _emptyToNull(_emergencyContact.text),
        licenseNumber: _emptyToNull(_licenseNumber.text),
        language: driverLanguageNotifier.value.name,
      );
      if (!mounted) return;
      final data = res['data'] as Map<String, dynamic>;
      final user = Map<String, dynamic>.from(data['user'] as Map);
      user['mobileRole'] = _driverType;
      user['partnerCompany'] =
          _driverType == 'external_driver' ? _partnerCompany.text.trim() : null;
      user['branch'] = _branch.text.trim();
      user['emergencyContact'] = _emergencyContact.text.trim();
        user['licenseNumber'] = _licenseNumber.text.trim();
      user['phone'] = _phoneNumber.text.trim();
      user['kycStatus'] = user['kycStatus'] ?? 'draft';
      await DriverApi.persistSession(
        accessToken: data['accessToken'] as String?,
        refreshToken: data['refreshToken'] as String?,
        user: user,
      );
      if (!mounted) return;
      await AppFlowNavigator.openDriverKycUpload(context, role: _driverType);
    } on HttpException catch (error) {
      if (!mounted) return;
      AuthFeedback.showMessage(context, error.message);
    } catch (_) {
      if (!mounted) return;
      AuthFeedback.showMessage(
        context,
        t(
          'submissionError',
          fallback: 'Submission failed. Review the fields and try again.',
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  String? _emptyToNull(String value) {
    final trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      showBackButton: true,
      onBackPressed: () => Navigator.of(context).maybePop(),
      title: t('driverOnboardingTitle', fallback: 'Driver onboarding'),
      subtitle: t('driverOnboardingSubtitle',
          fallback:
              'Use your phone number and create a 4-digit PIN, then complete the short driver profile before KYC upload.'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AuthTextField(
            controller: _phoneNumber,
            label: AuthCopy.customerPhoneLabel,
            hint: AuthCopy.driverPhoneHint,
            keyboardType: TextInputType.phone,
            prefixIcon: const Icon(Icons.phone_android_outlined),
          ),
          const SizedBox(height: 12),
          AuthTextField(
            controller: _fullName,
            label: AuthCopy.driverFullNameLabel,
            hint: AuthCopy.driverFullNameHint,
            prefixIcon: const Icon(Icons.person_outline),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _driverType,
            decoration: InputDecoration(
              labelText: t('driverType', fallback: 'Driver type'),
              prefixIcon: const Icon(Icons.badge_outlined),
            ),
            items: [
              DropdownMenuItem(
                value: 'internal_driver',
                child: Text(
                    t('internalDriverLabel', fallback: 'Internal driver')),
              ),
              DropdownMenuItem(
                value: 'external_driver',
                child: Text(
                    t('externalDriverLabel', fallback: 'External driver')),
              ),
            ],
            onChanged: (value) {
              if (value != null) {
                setState(() => _driverType = value);
              }
            },
          ),
          const SizedBox(height: 12),
          if (_driverType == 'external_driver') ...[
            AuthTextField(
              controller: _partnerCompany,
              label: AuthCopy.driverPartnerCompanyLabel,
              hint: AuthCopy.driverPartnerCompanyHint,
              prefixIcon: const Icon(Icons.apartment_outlined),
            ),
            const SizedBox(height: 12),
          ],
          AuthTextField(
            controller: _branch,
            label: AuthCopy.driverBranchLabel,
            hint: AuthCopy.driverBranchHint,
            prefixIcon: const Icon(Icons.route_outlined),
          ),
          const SizedBox(height: 12),
          AuthTextField(
            controller: _emergencyContact,
            label: AuthCopy.driverEmergencyPhoneLabel,
            hint: '+2519XXXXXXXX',
            keyboardType: TextInputType.phone,
            prefixIcon: const Icon(Icons.phone_callback_outlined),
          ),
          const SizedBox(height: 12),
          AuthTextField(
            controller: _licenseNumber,
            label: AuthCopy.driverLicenseNumberLabel,
            hint: AuthCopy.driverLicenseNumberHint,
            prefixIcon: const Icon(Icons.credit_card_outlined),
          ),
          const SizedBox(height: 12),
          AuthTextField(
            controller: _password,
            label: AuthCopy.driverPasswordLabel,
            hint: t('driverPinCreateHint', fallback: 'Create a 4-digit PIN'),
            keyboardType: TextInputType.number,
            prefixIcon: const Icon(Icons.lock_outline),
            obscureText: true,
          ),
          const SizedBox(height: 18),
          AuthInfoBanner(
            text: t('driverSignupHelp',
                fallback:
                    'Create a 4-digit PIN now. Next step: upload Fayda and driver license documents. Trip operations unlock only after KYC approval.'),
            icon: Icons.assignment_turned_in_outlined,
          ),
          const SizedBox(height: 18),
          AuthPrimaryButton(
            label: t('continueToKyc', fallback: 'Continue to KYC'),
            loadingLabel: t('creatingAccount', fallback: 'Creating account...'),
            loading: _loading,
            onPressed: _submit,
          ),
        ],
      ),
    );
  }
}
