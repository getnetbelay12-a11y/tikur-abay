import 'dart:io';

import 'package:flutter/material.dart';

import '../../navigation/app_flow_navigator.dart';
import '../../app_language.dart';
import '../../services/demo_field_defaults.dart';
import '../../services/driver_api.dart';
import '../../services/mobile_auth_service.dart';
import 'auth_content.dart';
import 'auth_widgets.dart';

class CustomerRegistrationScreen extends StatefulWidget {
  const CustomerRegistrationScreen({required this.identifier, super.key});

  final String identifier;

  @override
  State<CustomerRegistrationScreen> createState() =>
      _CustomerRegistrationScreenState();
}

class _CustomerRegistrationScreenState
    extends State<CustomerRegistrationScreen> {
  final _fullName = TextEditingController();
  final _companyName = TextEditingController();
  final _city = TextEditingController();
  final _password = TextEditingController();
  late final DemoFieldDefaults _demoDefaults;
  bool _loading = false;

  bool get _identifierIsEmail => AuthRules.isEmailIdentifier(widget.identifier);

  @override
  void initState() {
    super.initState();
    _demoDefaults = DemoFieldDefaults.generate(roleLabel: 'customer');
    _fullName.text = _demoDefaults.fullName;
    _companyName.text = _demoDefaults.companyName;
    _city.text = _demoDefaults.city;
  }

  @override
  void dispose() {
    _fullName.dispose();
    _companyName.dispose();
    _city.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    final validation = AuthRules.validateCustomerFullName(_fullName.text);
    if (validation != null) {
      AuthFeedback.showMessage(context, validation);
      return;
    }
    final passwordValidation = AuthRules.validatePassword(_password.text);
    if (passwordValidation != null) {
      AuthFeedback.showMessage(context, passwordValidation);
      return;
    }

    setState(() => _loading = true);
    try {
      final res = await MobileAuthService.registerCustomer(
        identifier: widget.identifier,
        fullName: _fullName.text.trim(),
        password: _password.text.trim(),
        companyName: _emptyToNull(_companyName.text),
        phone: _identifierIsEmail ? null : widget.identifier,
        email: _identifierIsEmail ? widget.identifier : null,
        language: driverLanguageNotifier.value.name,
      );
      if (!mounted) return;
      final data = res['data'] as Map<String, dynamic>;
      final user = Map<String, dynamic>.from(data['user'] as Map);
      if (_emptyToNull(_city.text) != null) {
        user['city'] = _city.text.trim();
      }
      if (_emptyToNull(_companyName.text) != null) {
        user['companyName'] = _companyName.text.trim();
      }
      await DriverApi.persistSession(
        accessToken: data['accessToken'] as String?,
        refreshToken: data['refreshToken'] as String?,
        user: user,
      );
      if (!mounted) return;
      await AppFlowNavigator.resetToRoleHome(context, role: 'customer');
    } on HttpException catch (error) {
      if (!mounted) return;
      AuthFeedback.showMessage(context, error.message);
    } catch (_) {
      if (!mounted) return;
      AuthFeedback.showMessage(
        context,
        'Unable to create the account right now.',
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
      title: t('completeYourProfile', fallback: 'Finish registration'),
      subtitle: t(
        'customerQuickRegistrationSubtitle',
        fallback:
            'We already verified your contact. Add the last few details to open your shipment workspace.',
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AuthInfoBanner(
            text: _identifierIsEmail
                ? 'Verified email: ${widget.identifier}'
                : 'Verified phone: ${widget.identifier}',
            icon: Icons.verified_user_outlined,
          ),
          const SizedBox(height: 16),
          AuthTextField(
            controller: _fullName,
            label: AuthCopy.customerFullNameLabel,
            hint: AuthCopy.customerFullNameHint,
            prefixIcon: const Icon(Icons.person_outline),
          ),
          const SizedBox(height: 12),
          AuthTextField(
            controller: _companyName,
            label: AuthCopy.customerCompanyLabel,
            hint: AuthCopy.customerOptionalHint,
            prefixIcon: const Icon(Icons.apartment_outlined),
          ),
          const SizedBox(height: 12),
          AuthTextField(
            controller: _city,
            label: AuthCopy.customerCityLabel,
            hint: 'Addis Ababa',
            prefixIcon: const Icon(Icons.location_city_outlined),
          ),
          const SizedBox(height: 12),
          AuthTextField(
            controller: _password,
            label: AuthCopy.customerPasswordLabel,
            hint: AuthCopy.customerPasswordHint,
            keyboardType: TextInputType.number,
            obscureText: true,
            prefixIcon: const Icon(Icons.lock_outline),
          ),
          const SizedBox(height: 18),
          AuthPrimaryButton(
            label: t('continueAction', fallback: 'Continue'),
            loadingLabel: t('creatingAccount', fallback: 'Creating account...'),
            loading: _loading,
            onPressed: _register,
          ),
        ],
      ),
    );
  }
}
