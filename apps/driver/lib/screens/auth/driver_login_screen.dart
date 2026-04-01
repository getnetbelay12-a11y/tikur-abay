import 'dart:io';

import 'package:flutter/material.dart';

import '../../navigation/app_flow_navigator.dart';
import '../../app_language.dart';
import '../../services/driver_api.dart';
import '../../services/mobile_auth_service.dart';
import 'driver_registration_screen.dart';
import 'auth_content.dart';
import 'auth_widgets.dart';

class DriverLoginScreen extends StatefulWidget {
  const DriverLoginScreen({super.key});

  @override
  State<DriverLoginScreen> createState() => _DriverLoginScreenState();
}

class _DriverLoginScreenState extends State<DriverLoginScreen> {
  static const String _defaultDriverPhone = '+251900000015';
  static const String _defaultDriverPin = '2112';
  final _controller = TextEditingController();
  final _passwordController = TextEditingController();
  bool _loading = false;
  String _driverType = 'internal_driver';
  String? _rememberedIdentifier;

  @override
  void initState() {
    super.initState();
    _controller.text = _defaultDriverPhone;
    _passwordController.text = _defaultDriverPin;
    _restoreRememberedIdentifier();
  }

  @override
  void dispose() {
    _controller.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _restoreRememberedIdentifier() async {
    final identifier = await DriverApi.lastDriverIdentifier();
    if (!mounted) return;
    setState(() {
      _rememberedIdentifier = identifier;
      if (identifier != null && identifier.isNotEmpty) {
        _controller.text = identifier;
      } else {
        _controller.text = _defaultDriverPhone;
      }
    });
  }

  Future<void> _signInWithPassword() async {
    final identifier = _controller.text.trim();
    final phoneValidation = AuthRules.validateDriverPhone(identifier);
    if (phoneValidation != null) {
      AuthFeedback.showMessage(context, phoneValidation);
      return;
    }
    final validationMessage =
        AuthRules.validatePassword(_passwordController.text);
    if (validationMessage != null) {
      AuthFeedback.showMessage(context, validationMessage);
      return;
    }

    setState(() => _loading = true);
    try {
      final res = await MobileAuthService.loginDriver(
        identifier: identifier,
        password: _passwordController.text.trim(),
      );
      if (!mounted) return;
      final data = Map<String, dynamic>.from(
          (res['data'] as Map?)?.cast<String, dynamic>() ?? res);
      final user = Map<String, dynamic>.from(data['user'] as Map);
      await DriverApi.persistSession(
        accessToken: data['accessToken'] as String?,
        refreshToken: data['refreshToken'] as String?,
        user: user,
      );
      if (!mounted) return;
      await AppFlowNavigator.resetToRoleHome(
        context,
        role: (user['mobileRole'] ?? user['role'] ?? _driverType).toString(),
        kycStatus: user['kycStatus']?.toString(),
      );
    } on HttpException catch (error) {
      if (!mounted) return;
      AuthFeedback.showMessage(context, error.message);
    } catch (_) {
      if (!mounted) return;
      AuthFeedback.showMessage(context, 'Unable to sign in right now.');
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _openSignup() async {
    final phone = _controller.text.trim();
    final validationMessage = AuthRules.validateDriverPhone(phone);
    if (validationMessage != null) {
      AuthFeedback.showMessage(context, validationMessage);
      return;
    }
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => DriverRegistrationScreen(identifier: phone),
      ),
    );
    await _restoreRememberedIdentifier();
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<DriverLanguage>(
      valueListenable: driverLanguageNotifier,
      builder: (context, _, __) {
        return AuthScaffold(
          title: AuthCopy.driverLoginTitle,
          subtitle: AuthCopy.driverLoginSubtitle,
          showBackButton: true,
          onBackPressed: () => AppFlowNavigator.resetToLogin(context),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AuthSectionTitle(
                  t('driverAccess', fallback: 'Driver access')),
              const SizedBox(height: 12),
              if (_rememberedIdentifier != null &&
                  _rememberedIdentifier!.isNotEmpty) ...[
                AuthInfoBanner(
                  text: tr('savedDriverNumber',
                      params: {'identifier': _rememberedIdentifier!},
                      fallback:
                          'Saved driver number: $_rememberedIdentifier'),
                  icon: Icons.lock_person_outlined,
                ),
                const SizedBox(height: 12),
              ],
              AuthMutedText(AuthCopy.driverPhoneHelp),
              const SizedBox(height: 12),
              AuthTextField(
                controller: _controller,
                label: AuthCopy.customerPhoneLabel,
                hint: AuthCopy.driverPhoneHint,
                keyboardType: TextInputType.phone,
                prefixIcon: const Icon(Icons.phone_android_outlined),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: _DriverTypeChip(
                      label:
                          t('internalDriverLabel', fallback: 'Internal driver'),
                      selected: _driverType == 'internal_driver',
                      onTap: () =>
                          setState(() => _driverType = 'internal_driver'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _DriverTypeChip(
                      label:
                          t('externalDriverLabel', fallback: 'External driver'),
                      selected: _driverType == 'external_driver',
                      onTap: () =>
                          setState(() => _driverType = 'external_driver'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              AuthTextField(
                controller: _passwordController,
                label: AuthCopy.driverPasswordLabel,
                hint: AuthCopy.driverPasswordHint,
                keyboardType: TextInputType.number,
                prefixIcon: const Icon(Icons.lock_outline),
                obscureText: true,
              ),
              const SizedBox(height: 10),
              const AuthInfoBanner(
                text:
                    'Default demo login: +251900000015 with PIN 2112. Drivers sign in with phone number and PIN only.',
                icon: Icons.phone_iphone_outlined,
              ),
              const SizedBox(height: 18),
              AuthPrimaryButton(
                label: t('signIn', fallback: 'Sign in'),
                loadingLabel: t('signingIn', fallback: 'Signing in...'),
                loading: _loading,
                onPressed: _signInWithPassword,
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: _loading ? null : _openSignup,
                child: Text(
                    t('createDriverAccount', fallback: 'Create driver account')),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _DriverTypeChip extends StatelessWidget {
  const _DriverTypeChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFF16324D) : const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: selected ? const Color(0xFF16324D) : const Color(0xFFD7E2F0),
          ),
        ),
        child: Center(
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: selected ? Colors.white : const Color(0xFF16324D),
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ),
    );
  }
}
