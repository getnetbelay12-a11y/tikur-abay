import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../../navigation/app_flow_navigator.dart';
import '../../app_language.dart';
import '../../services/driver_api.dart';
import '../../services/mobile_auth_service.dart';
import 'auth_content.dart';
import 'auth_widgets.dart';

class OtpVerificationScreen extends StatefulWidget {
  const OtpVerificationScreen({
    required this.identifier,
    required this.role,
    this.debugOtp,
    super.key,
  });

  final String identifier;
  final String role;
  final String? debugOtp;

  @override
  State<OtpVerificationScreen> createState() => _OtpVerificationScreenState();
}

class _OtpVerificationScreenState extends State<OtpVerificationScreen> {
  final _controller = TextEditingController();
  bool _loading = false;
  bool _resending = false;

  bool get _showDebugOtp => kDebugMode && widget.debugOtp != null;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    final code = _controller.text.trim();
    final validationMessage = AuthRules.validateOtp(code);
    if (validationMessage != null) {
      AuthFeedback.showMessage(context, validationMessage);
      return;
    }

    setState(() => _loading = true);
    try {
      final res = await MobileAuthService.verifyOtp(
        identifier: widget.identifier,
        role: widget.role,
        code: code,
      );
      if (!mounted) return;

      final data = res['data'] as Map<String, dynamic>? ?? {};
      if (data['existingUser'] == true) {
        final user = Map<String, dynamic>.from(data['user'] as Map);
        await DriverApi.persistSession(
          accessToken: data['accessToken'] as String?,
          refreshToken: data['refreshToken'] as String?,
          user: user,
        );
        if (!mounted) return;
        await AppFlowNavigator.resetToRoleHome(
          context,
          role: (user['mobileRole'] ?? user['role'] ?? widget.role).toString(),
          kycStatus: user['kycStatus']?.toString(),
        );
        return;
      }

      await AppFlowNavigator.replaceWithRegistration(
        context,
        identifier: widget.identifier,
        role: widget.role,
      );
    } on HttpException catch (error) {
      if (!mounted) return;
      AuthFeedback.showMessage(context, error.message);
    } catch (_) {
      if (!mounted) return;
      AuthFeedback.showMessage(context, 'Unable to verify the code right now.');
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _resendCode() async {
    setState(() => _resending = true);
    try {
      final res = await MobileAuthService.sendOtp(
        identifier: widget.identifier,
        role: widget.role,
        language: driverLanguageNotifier.value.name,
      );
      if (!mounted) return;
      final newDebugOtp = res['data']?['debugOtp']?.toString();
      AuthFeedback.showMessage(
        context,
        !kDebugMode || newDebugOtp == null
            ? 'A new code was sent.'
            : 'A new code was sent. Debug OTP: $newDebugOtp',
      );
    } on HttpException catch (error) {
      if (!mounted) return;
      AuthFeedback.showMessage(context, error.message);
    } catch (_) {
      if (!mounted) return;
      AuthFeedback.showMessage(context, 'Unable to resend the code right now.');
    } finally {
      if (mounted) {
        setState(() => _resending = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final code = _controller.text;

    return ValueListenableBuilder<DriverLanguage>(
      valueListenable: driverLanguageNotifier,
      builder: (context, _, __) {
        return AuthScaffold(
          title: AuthCopy.otpTitle,
          subtitle: AuthCopy.otpSubtitle(widget.identifier),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_showDebugOtp) ...[
                AuthInfoBanner(
                  text: 'Debug OTP: ${widget.debugOtp}',
                  icon: Icons.developer_mode_outlined,
                ),
                const SizedBox(height: 16),
              ],
              GestureDetector(
                onTap: () => FocusScope.of(context).unfocus(),
                child: AnimatedBuilder(
                  animation: _controller,
                  builder: (context, _) {
                    return Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: List.generate(6, (index) {
                        final digit = index < code.length ? code[index] : '';
                        return Expanded(
                          child: Container(
                            height: 58,
                            margin: EdgeInsets.only(right: index == 5 ? 0 : 8),
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: digit.isEmpty
                                    ? const Color(0xFFD7E2F0)
                                    : const Color(0xFF2F80ED),
                                width: 1.4,
                              ),
                            ),
                            child: Text(
                              digit,
                              style: const TextStyle(
                                  fontSize: 22, fontWeight: FontWeight.w700),
                            ),
                          ),
                        );
                      }),
                    );
                  },
                ),
              ),
              const SizedBox(height: 12),
              AuthTextField(
                controller: _controller,
                label: AuthCopy.otpInputLabel,
                hint: AuthCopy.otpInputHint,
                keyboardType: TextInputType.number,
                prefixIcon: const Icon(Icons.password_outlined),
              ),
              const SizedBox(height: 18),
              AuthPrimaryButton(
                label: t('verifyCode', fallback: 'Verify code'),
                loadingLabel: t('verifyingCode', fallback: 'Verifying...'),
                loading: _loading,
                onPressed: _verify,
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  TextButton(
                    onPressed: _resending ? null : _resendCode,
                    child: Text(
                      _resending
                          ? t('resendingCode', fallback: 'Resending...')
                          : t('resendCode', fallback: 'Resend code'),
                    ),
                  ),
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: Text(
                      t('changeNumber', fallback: 'Change number'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
