import 'package:flutter/material.dart';

import '../../app_language.dart';
import '../../navigation/app_flow_navigator.dart';
import '../../services/driver_api.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = DriverSession.user ?? <String, dynamic>{};
    final mobileRole =
        (user['mobileRole'] ?? user['role'] ?? 'customer').toString();
    final isDriver = mobileRole.contains('driver');
    final details = [
      (t('name', fallback: 'Name'),
          user['name']?.toString() ?? 'Tikur Abay User'),
      if (!isDriver)
        (t('company', fallback: 'Company'),
            user['companyName']?.toString() ??
                t('customerAccount', fallback: 'Customer account')),
      (
        t('contact', fallback: 'Contact'),
        user['phone']?.toString() ??
            user['email']?.toString() ??
            t('notSet', fallback: 'Not set')
      ),
      if (isDriver)
        (t('branch', fallback: 'Branch'),
            user['branch']?.toString() ?? 'Addis Ababa'),
      if (isDriver)
        (t('kycStatus', fallback: 'KYC status'),
            user['kycStatus']?.toString() ?? 'draft'),
      if (isDriver && (user['partnerCompany']?.toString().isNotEmpty ?? false))
        (t('partner', fallback: 'Partner'),
            user['partnerCompany']?.toString() ?? ''),
    ];

    return ValueListenableBuilder<DriverLanguage>(
      valueListenable: driverLanguageNotifier,
      builder: (context, currentLanguage, _) {
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isDriver
                          ? t('driverProfileTitle',
                              fallback: 'Driver profile')
                          : t('customerProfileTitle',
                              fallback: 'Customer profile'),
                      style: const TextStyle(
                          fontSize: 18, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<DriverLanguage>(
                      initialValue: currentLanguage,
                      decoration: InputDecoration(
                        labelText: t('language', fallback: 'Language'),
                        prefixIcon: const Icon(Icons.language_outlined),
                      ),
                      items: [
                        DropdownMenuItem(
                            value: DriverLanguage.en,
                            child: Text(driverLanguageLabel(DriverLanguage.en))),
                        DropdownMenuItem(
                            value: DriverLanguage.am,
                            child: Text(driverLanguageLabel(DriverLanguage.am))),
                      ],
                      onChanged: (value) async {
                        if (value == null) return;
                        await setDriverLanguage(value);
                        if (!context.mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                              content: Text(t('languageUpdated',
                                  fallback:
                                      'Language preference updated.'))),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            ...details.map(
              (detail) => Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  contentPadding: const EdgeInsets.all(16),
                  title: Text(detail.$1,
                      style: const TextStyle(fontWeight: FontWeight.w700)),
                  subtitle: Text(detail.$2),
                ),
              ),
            ),
            Card(
              child: ListTile(
                contentPadding: const EdgeInsets.all(16),
                leading: const Icon(Icons.logout),
                title: Text(t('logout', fallback: 'Logout'),
                    style: const TextStyle(fontWeight: FontWeight.w700)),
                subtitle: Text(t('signOutCurrentSession',
                    fallback: 'Sign out of the current mobile session')),
                onTap: () async {
                  final role = (DriverSession.user?['mobileRole'] ??
                          DriverSession.user?['role'])
                      .toString();
                  await DriverApi.logout();
                  if (!context.mounted) return;
                  await AppFlowNavigator.resetToRoleLogin(context, role: role);
                },
              ),
            ),
          ],
        );
      },
    );
  }
}
