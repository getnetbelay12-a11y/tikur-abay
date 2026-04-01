import 'package:flutter/material.dart';

import '../../navigation/app_flow_navigator.dart';
import '../../app_language.dart';
import '../../services/demo_field_defaults.dart';
import '../../services/driver_api.dart';
import '../../services/mobile_auth_service.dart';
import 'auth_content.dart';
import 'auth_widgets.dart';

class CustomerLoginScreen extends StatefulWidget {
  const CustomerLoginScreen({super.key});

  @override
  State<CustomerLoginScreen> createState() => _CustomerLoginScreenState();
}

class _CustomerLoginScreenState extends State<CustomerLoginScreen> {
  final _controller = TextEditingController();
  final _passwordController = TextEditingController();
  late final DemoFieldDefaults _demoDefaults;
  bool _useEmail = false;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _demoDefaults = DemoFieldDefaults.generate(roleLabel: 'customer');
    _controller.text = _demoDefaults.phone;
  }

  @override
  void dispose() {
    _controller.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    final identifier = _controller.text.trim();
    final validationMessage = AuthRules.validateCustomerIdentifier(identifier);
    if (validationMessage != null) {
      AuthFeedback.showMessage(context, validationMessage);
      return;
    }
    final passwordValidation = AuthRules.validatePassword(_passwordController.text);
    if (passwordValidation != null) {
      AuthFeedback.showMessage(context, passwordValidation);
      return;
    }

    setState(() => _loading = true);
    try {
      final res = await MobileAuthService.loginCustomer(
        identifier: identifier,
        password: _passwordController.text.trim(),
      );
      if (!mounted) return;
      final data = res['data'] as Map<String, dynamic>;
      await DriverApi.persistSession(
        accessToken: data['accessToken'] as String?,
        refreshToken: data['refreshToken'] as String?,
        user: Map<String, dynamic>.from(data['user'] as Map),
      );
      if (!mounted) return;
      final navigator = AppFlowNavigator.resetToRoleHome;
      await navigator(context, role: 'customer');
    } catch (_) {
      if (!mounted) return;
      AuthFeedback.showMessage(context, 'Unable to sign in right now.');
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<DriverLanguage>(
      valueListenable: driverLanguageNotifier,
      builder: (context, _, __) {
        return AuthScaffold(
          title: AuthCopy.customerLoginTitle,
          subtitle: AuthCopy.customerLoginSubtitle,
          showBackButton: true,
          onBackPressed: () => AppFlowNavigator.resetToLogin(context),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AuthTextField(
                controller: _controller,
                label: AuthCopy.customerIdentifierLabel(_useEmail),
                hint: AuthCopy.customerIdentifierHint(_useEmail),
                keyboardType: _useEmail
                    ? TextInputType.emailAddress
                    : TextInputType.phone,
                prefixIcon: Icon(_useEmail
                    ? Icons.alternate_email_outlined
                    : Icons.phone_outlined),
              ),
              const SizedBox(height: 12),
              AuthTextField(
                controller: _passwordController,
                label: AuthCopy.customerPasswordLabel,
                hint: AuthCopy.customerPasswordHint,
                keyboardType: TextInputType.number,
                obscureText: true,
                prefixIcon: const Icon(Icons.lock_outline),
              ),
              const SizedBox(height: 12),
              SwitchListTile.adaptive(
                value: _useEmail,
                contentPadding: EdgeInsets.zero,
                title: Text(
                  t('useEmailInstead', fallback: 'Use email instead'),
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: Text(
                  t(
                    'phoneDefaultSignIn',
                    fallback: 'Phone remains the default sign-in method.',
                  ),
                ),
                onChanged: (value) => setState(() {
                  _useEmail = value;
                  _controller.text =
                      value ? _demoDefaults.email : _demoDefaults.phone;
                }),
              ),
              const SizedBox(height: 16),
              AuthPrimaryButton(
                label: t('signIn', fallback: 'Sign in'),
                loadingLabel: t('signingIn', fallback: 'Signing in...'),
                loading: _loading,
                onPressed: _login,
              ),
              const SizedBox(height: 12),
              FilledButton.tonal(
                onPressed: () => AppFlowNavigator.replaceWithRegistration(
                  context,
                  identifier: _controller.text.trim(),
                  role: 'customer',
                ),
                child: const Text('Create customer account'),
              ),
              const SizedBox(height: 12),
              const AuthSupportLink(),
            ],
          ),
        );
      },
    );
  }
}
