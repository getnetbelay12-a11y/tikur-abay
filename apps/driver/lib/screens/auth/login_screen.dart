import 'package:flutter/material.dart';

import '../../navigation/app_flow_navigator.dart';
import '../../app_language.dart';
import 'auth_widgets.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<DriverLanguage>(
      valueListenable: driverLanguageNotifier,
      builder: (context, currentLanguage, _) {
        return AuthScaffold(
          headerTrailing: _LanguageToggle(
            currentLanguage: currentLanguage,
          ),
          title: t('welcomeTikurAbay', fallback: 'Welcome to Tikur Abay'),
          subtitle: t(
            'welcomeMobileSubtitle',
            fallback:
                'OTP-first corridor access for customers, internal drivers, and external drivers.',
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AuthSectionTitle(t('continueAs', fallback: 'Continue as')),
              const SizedBox(height: 14),
              RoleChoiceCard(
                icon: Icons.business_center_outlined,
                title: t('customerUserShort', fallback: 'Customer / User'),
                subtitle: t(
                  'customerRoleSubtitle',
                  fallback:
                      'Use phone or email, verify OTP, then open shipment, customs, and document visibility immediately.',
                ),
                filled: true,
                onTap: () => AppFlowNavigator.openCustomerLogin(context),
              ),
              const SizedBox(height: 12),
              RoleChoiceCard(
                icon: Icons.local_shipping_outlined,
                title: t('driverRole', fallback: 'Driver'),
                subtitle: t(
                  'driverRoleSubtitle',
                  fallback:
                      'Use phone first, choose internal or external driver mode, then open the transit and customs pack.',
                ),
                onTap: () => AppFlowNavigator.openDriverLogin(context),
              ),
              const SizedBox(height: 16),
              AuthMutedText(
                t(
                  'chooseHowContinue',
                  fallback:
                      'Customers get shipment visibility. Drivers get only trip-specific customs, checkpoint, and issue workflows.',
                ),
                center: true,
              ),
            ],
          ),
        );
      },
    );
  }
}

class _LanguageToggle extends StatelessWidget {
  const _LanguageToggle({
    required this.currentLanguage,
  });

  final DriverLanguage currentLanguage;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AuthPalette.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _LanguageChip(
            label: 'EN',
            selected: currentLanguage == DriverLanguage.en,
            onTap: () => setDriverLanguage(
              DriverLanguage.en,
              persistRemote: false,
            ),
          ),
          _LanguageChip(
            label: currentLanguage == DriverLanguage.am ? 'አማ' : 'AM',
            selected: currentLanguage == DriverLanguage.am,
            onTap: () => setDriverLanguage(
              DriverLanguage.am,
              persistRemote: false,
            ),
          ),
        ],
      ),
    );
  }
}

class _LanguageChip extends StatelessWidget {
  const _LanguageChip({
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
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? AuthPalette.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.white : AuthPalette.primary,
            fontWeight: FontWeight.w700,
            fontSize: 12,
          ),
        ),
      ),
    );
  }
}
