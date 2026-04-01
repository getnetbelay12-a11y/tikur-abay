import 'package:flutter_test/flutter_test.dart';
import 'package:tikur_abay_driver/screens/auth/auth_content.dart';

void main() {
  group('AuthCopy', () {
    test('returns identifier labels and hints by mode', () {
      expect(AuthCopy.customerIdentifierLabel(false), 'Phone number');
      expect(AuthCopy.customerIdentifierLabel(true), 'Email address');
      expect(AuthCopy.customerIdentifierHint(false), '+251912345678');
      expect(AuthCopy.customerIdentifierHint(true), 'example@email.com');
    });

    test('builds OTP subtitle with configured digit count', () {
      expect(
        AuthCopy.otpSubtitle('+251900000000'),
        'We sent a 6-digit code to +251900000000.',
      );
    });
  });

  group('AuthRules', () {
    test('validates customer identifier and driver phone presence', () {
      expect(
        AuthRules.validateCustomerIdentifier(''),
        'Enter your phone number or email.',
      );
      expect(AuthRules.validateCustomerIdentifier('+251900000000'), isNull);

      expect(AuthRules.validateDriverPhone(''), 'Enter your phone number.');
      expect(AuthRules.validateDriverPhone('+251900000000'), isNull);
    });

    test('validates OTP length', () {
      expect(AuthRules.validateOtp('12345'), 'Enter the 6-digit code.');
      expect(AuthRules.validateOtp('123456'), isNull);
    });

    test('validates driver onboarding requirements in order', () {
      expect(
        AuthRules.validateDriverOnboarding(
          fullName: '',
          branch: 'Addis',
          isExternal: false,
          partnerCompany: '',
          hasAllRequiredDocuments: true,
        ),
        'Enter the driver full name.',
      );

      expect(
        AuthRules.validateDriverOnboarding(
          fullName: 'Abel',
          branch: '',
          isExternal: false,
          partnerCompany: '',
          hasAllRequiredDocuments: true,
        ),
        'Enter the assigned branch.',
      );

      expect(
        AuthRules.validateDriverOnboarding(
          fullName: 'Abel',
          branch: 'Addis',
          isExternal: true,
          partnerCompany: '',
          hasAllRequiredDocuments: true,
        ),
        'Enter the partner company name.',
      );

      expect(
        AuthRules.validateDriverOnboarding(
          fullName: 'Abel',
          branch: 'Addis',
          isExternal: false,
          partnerCompany: '',
          hasAllRequiredDocuments: false,
        ),
        'Attach the required KYC documents.',
      );

      expect(
        AuthRules.validateDriverOnboarding(
          fullName: 'Abel',
          branch: 'Addis',
          isExternal: true,
          partnerCompany: 'Partner Fleet',
          hasAllRequiredDocuments: true,
        ),
        isNull,
      );
    });
  });
}
