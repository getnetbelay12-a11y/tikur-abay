import 'package:flutter/material.dart';

import 'app_language.dart';
import 'navigation/app_flow_navigator.dart';
import 'services/driver_api.dart';
import 'screens/auth/login_screen.dart';
import 'screens/chat/chat_screen.dart';
import 'screens/customer/customer_home_screen.dart';
import 'screens/customer/customer_payments_screen.dart';
import 'screens/customer/customer_shipments_screen.dart';
import 'screens/driver/driver_assigned_trip_screen.dart';
import 'screens/driver/driver_expenses_screen.dart';
import 'screens/driver/driver_home_screen.dart';
import 'screens/driver/driver_transit_pack_screen.dart';
import 'screens/profile/profile_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await DriverApi.hydrateSession();
  if (DriverSession.accessToken != null && DriverSession.user != null) {
    try {
      final me = await DriverApi.fetchMe();
      if (me == null) {
        await DriverApi.logout();
      }
    } catch (_) {
      await DriverApi.logout();
    }
  }
  await initializeDriverLanguage();
  runApp(const TikurAbayDriverApp());
}

class TikurAbayDriverApp extends StatelessWidget {
  const TikurAbayDriverApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<DriverLanguage>(
      valueListenable: driverLanguageNotifier,
      builder: (context, _, __) {
        return MaterialApp(
          title: t('appTitle', fallback: 'Tikur Abay Mobile'),
          debugShowCheckedModeBanner: false,
          locale: Locale(driverLanguageNotifier.value.name),
          supportedLocales: const [Locale('en'), Locale('am')],
          theme: ThemeData(
            useMaterial3: true,
            colorScheme: ColorScheme.fromSeed(
              seedColor: const Color(0xFF16324D),
              brightness: Brightness.light,
            ),
            scaffoldBackgroundColor: const Color(0xFFF3F6FA),
            cardTheme: const CardThemeData(
              color: Colors.white,
              elevation: 0,
              margin: EdgeInsets.zero,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.all(Radius.circular(22)),
              ),
            ),
          ),
          home: DriverSession.accessToken != null && DriverSession.user != null
              ? const MobileRoleHome()
              : const LoginScreen(),
        );
      },
    );
  }
}

class MobileRoleHome extends StatelessWidget {
  const MobileRoleHome({super.key});

  @override
  Widget build(BuildContext context) {
    final user = DriverSession.user ?? <String, dynamic>{};
    final role = _mobileRoleOfCurrentUser();
    final kycStatus = user['kycStatus']?.toString();
    if (role == 'customer') {
      return const CustomerHomeShell();
    }
    if (_requiresDriverKycHold(kycStatus)) {
      return DriverKycPendingScreen(status: kycStatus!);
    }
    return const DriverHomeShell();
  }
}

class CustomerHomeShell extends StatefulWidget {
  const CustomerHomeShell({super.key});

  @override
  State<CustomerHomeShell> createState() => _CustomerHomeShellState();
}

class _CustomerHomeShellState extends State<CustomerHomeShell> {
  int _currentIndex = 0;

  List<_ShellTab> get _tabs => [
        _ShellTab(
            label: t('home', fallback: 'Home'),
            icon: Icons.home_outlined,
            screen: const CustomerHomeScreen()),
        _ShellTab(
            label: t('activeTrips', fallback: 'Trips'),
            icon: Icons.local_shipping_outlined,
            screen: const CustomerShipmentsScreen()),
        _ShellTab(
            label: t('payments', fallback: 'Payments'),
            icon: Icons.receipt_long_outlined,
            screen: const CustomerPaymentsScreen()),
        _ShellTab(
            label: t('supportTitle', fallback: 'Support'),
            icon: Icons.support_agent_outlined,
            screen: const ChatScreen()),
        _ShellTab(
            label: t('profile', fallback: 'Profile'),
            icon: Icons.person_outline,
            screen: const ProfileScreen()),
      ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_tabs[_currentIndex].label),
        centerTitle: false,
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: _tabs.map((tab) => tab.screen).toList(),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        destinations: _tabs
            .map((tab) =>
                NavigationDestination(icon: Icon(tab.icon), label: tab.label))
            .toList(),
        onDestinationSelected: (index) => setState(() => _currentIndex = index),
      ),
    );
  }
}

class DriverHomeShell extends StatefulWidget {
  const DriverHomeShell({super.key});

  @override
  State<DriverHomeShell> createState() => _DriverHomeShellState();
}

class _DriverHomeShellState extends State<DriverHomeShell> {
  int _currentIndex = 0;

  List<_ShellTab> get _tabs => [
        _ShellTab(
            label: t('home', fallback: 'Home'),
            icon: Icons.home_outlined,
            screen: const DriverHomeScreen()),
        _ShellTab(
            label: t('trip', fallback: 'Trip'),
            icon: Icons.assignment_outlined,
            screen: const DriverAssignedTripScreen()),
        _ShellTab(
            label: t('transitPackTitle', fallback: 'Transit Pack'),
            icon: Icons.qr_code_2_outlined,
            screen: const DriverTransitPackScreen()),
        _ShellTab(
            label: t('payments', fallback: 'Expenses'),
            icon: Icons.receipt_long_outlined,
            screen: const DriverExpensesScreen()),
        _ShellTab(
            label: t('supportTitle', fallback: 'Live Chat'),
            icon: Icons.support_agent_outlined,
            screen: const ChatScreen()),
        _ShellTab(
            label: t('profile', fallback: 'Profile'),
            icon: Icons.person_outline,
            screen: const ProfileScreen()),
      ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_tabs[_currentIndex].label),
        centerTitle: false,
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: _tabs.map((tab) => tab.screen).toList(),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        destinations: _tabs
            .map((tab) =>
                NavigationDestination(icon: Icon(tab.icon), label: tab.label))
            .toList(),
        onDestinationSelected: (index) => setState(() => _currentIndex = index),
      ),
    );
  }
}

class DriverKycPendingScreen extends StatelessWidget {
  const DriverKycPendingScreen({required this.status, super.key});

  final String status;

  String get _title {
    switch (status) {
      case 'submitted':
        return t('kycSubmittedTitle', fallback: 'KYC Submitted');
      case 'under_review':
        return t('kycUnderReviewTitle', fallback: 'KYC Under Review');
      case 'rejected':
        return t('kycNeedsResubmissionTitle',
            fallback: 'KYC Needs Resubmission');
      case 'suspended':
        return t('kycAccessRestrictedTitle',
            fallback: 'KYC Access Restricted');
      default:
        return t('kycPendingTitle', fallback: 'KYC Pending');
    }
  }

  String get _subtitle {
    switch (status) {
      case 'submitted':
        return t('kycSubmittedSubtitle',
            fallback: 'Your KYC package is recorded and waiting for review.');
      case 'under_review':
        return t('kycUnderReviewSubtitle',
            fallback:
                'Tikur Abay operations is reviewing your Fayda and license documents.');
      case 'rejected':
        return t('kycRejectedSubtitle',
            fallback:
                'Update the missing or rejected documents to continue into trip operations.');
      case 'suspended':
        return t('kycSuspendedSubtitle',
            fallback:
                'Your driver account is temporarily restricted. Contact support.');
      default:
        return t('kycPendingSubtitle',
            fallback: 'Complete onboarding before trip operations unlock.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final role = _mobileRoleOfCurrentUser();
    final docs = [
      (t('faydaFrontLabel', fallback: 'Fayda front'),
          DriverSession.user?['faydaFrontStatus'] ??
              t('uploadedStatus', fallback: 'Uploaded')),
      (t('faydaBackLabel', fallback: 'Fayda back'),
          DriverSession.user?['faydaBackStatus'] ??
              t('uploadedStatus', fallback: 'Uploaded')),
      (
        t('driverLicenseLabel', fallback: 'Driver license'),
        DriverSession.user?['licenseDocumentStatus'] ??
            t('uploadedStatus', fallback: 'Uploaded')
      ),
    ];
    return Scaffold(
      appBar: AppBar(title: Text(t('driverKycTitle', fallback: 'Driver KYC'))),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_title,
                        style: const TextStyle(
                            fontSize: 22, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 8),
                    Text(_subtitle,
                        style: const TextStyle(
                            fontSize: 14, color: Color(0xFF5B677A))),
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: status == 'rejected'
                            ? const Color(0xFFFFF1F1)
                            : const Color(0xFFF5F7FB),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        '${t('statusLabel', fallback: 'Status')}: ${status.replaceAll('_', ' ')}',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: status == 'rejected'
                              ? const Color(0xFFD64545)
                              : const Color(0xFF16324D),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(t('uploadedDocumentsTitle',
                            fallback: 'Uploaded documents'),
                        style: const TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 12),
                    ...docs.map((doc) => Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: Row(
                            children: [
                              const Icon(Icons.description_outlined, size: 18),
                              const SizedBox(width: 10),
                              Expanded(child: Text(doc.$1)),
                              Text(doc.$2.toString(),
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w700)),
                            ],
                          ),
                        )),
                  ],
                ),
              ),
            ),
            const Spacer(),
            if (status == 'rejected')
              FilledButton.tonal(
                onPressed: () =>
                    AppFlowNavigator.openDriverKycUpload(context, role: role),
                child: Text(
                    t('resubmitDocuments', fallback: 'Resubmit documents')),
              ),
            const SizedBox(height: 10),
            FilledButton(
              onPressed: () async {
                final savedRole =
                    (DriverSession.user?['mobileRole'] ?? role).toString();
                await DriverApi.logout();
                if (!context.mounted) return;
                await AppFlowNavigator.resetToRoleLogin(context,
                    role: savedRole);
              },
              child: Text(t('logout', fallback: 'Logout')),
            ),
          ],
        ),
      ),
    );
  }
}

class _ShellTab {
  const _ShellTab({
    required this.label,
    required this.icon,
    required this.screen,
  });

  final String label;
  final IconData icon;
  final Widget screen;
}

String _mobileRoleOfCurrentUser() {
  final user = DriverSession.user ?? <String, dynamic>{};
  final mobileRole = (user['mobileRole'] ?? user['role'] ?? '').toString();
  if (mobileRole == 'external_driver' ||
      mobileRole == 'internal_driver' ||
      mobileRole == 'customer') {
    return mobileRole;
  }
  if (mobileRole == 'driver') return 'internal_driver';
  return 'customer';
}

bool _requiresDriverKycHold(String? kycStatus) {
  switch ((kycStatus ?? '').trim().toLowerCase()) {
    case 'submitted':
    case 'under_review':
    case 'rejected':
    case 'suspended':
      return true;
    default:
      return false;
  }
}
