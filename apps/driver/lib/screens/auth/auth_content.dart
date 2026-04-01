import '../../app_language.dart';

class AuthCopy {
  static String get customerLoginTitle =>
      t('customerLoginTitle', fallback: 'Customer Login');
  static String get customerLoginSubtitle => t('customerLoginSubtitle',
      fallback:
          'Use your phone number or email and your 4-digit PIN.');
  static String get customerEmailLabel =>
      t('emailAddress', fallback: 'Email address');
  static String get customerPhoneLabel =>
      t('phoneNumber', fallback: 'Phone number');
  static String get customerEmailHint =>
      t('emailExample', fallback: 'example@email.com');
  static String get customerPhoneHint => '+251912345678';
  static String get customerIdentifierEmailUsedLabel =>
      t('emailUsedForOtp', fallback: 'Email used for OTP');
  static String get customerIdentifierPhoneUsedLabel =>
      t('phoneUsedForOtp', fallback: 'Phone used for OTP');
  static String get customerFullNameLabel => 'Full name';
  static String get customerFullNameHint => t('legalOrBusinessContactName',
      fallback: 'Your legal or business contact name');
  static String get customerCompanyLabel => 'Company name';
  static String get customerPasswordLabel =>
      t('customerPinLabel', fallback: '4-digit PIN');
  static String get customerPasswordHint =>
      t('customerPinHint', fallback: 'Enter your 4-digit PIN');
  static String get customerOptionalHint =>
      t('optional', fallback: 'Optional');
  static String get customerCityLabel =>
      t('cityOrBranch', fallback: 'City or branch');

  static String get driverLoginTitle =>
      t('driverLoginTitle', fallback: 'Driver Login');
  static String get driverLoginSubtitle => t('driverLoginSubtitle',
      fallback:
          'Sign in with your phone number and 4-digit PIN. KYC approval still controls trip access.');
  static String get driverPhoneHint => '+2519XXXXXXXX';
  static String get driverPhoneHelp => t('driverPhoneHelp',
      fallback:
          'Use the registered driver phone number. Default demo login is +251900000015 with PIN 2112.');
  static String get driverPasswordLabel =>
      t('driverPinLabel', fallback: '4-digit PIN');
  static String get driverPasswordHint =>
      t('driverPinHint', fallback: 'Enter your 4-digit PIN');
  static String get driverFullNameLabel => 'Full name';
  static String get driverFullNameHint =>
      t('driverFullNameHintText', fallback: 'Driver legal name');
  static String get driverPartnerCompanyLabel => 'Partner company';
  static String get driverPartnerCompanyHint => t(
      'driverPartnerCompanyHintText',
      fallback: 'External operator or fleet partner');
  static String get driverBranchLabel => 'Branch';
  static String get driverBranchHint => t('driverBranchHintText',
      fallback: 'Assigned branch or operations base');
  static String get driverEmergencyNameLabel => 'Emergency contact name';
  static String get driverEmergencyNameHint => t(
      'driverEmergencyNameHintText',
      fallback: 'Required for field support');
  static String get driverEmergencyPhoneLabel => 'Emergency contact phone';
  static String get driverLicenseNumberLabel => 'Driver license number';
  static String get driverLicenseNumberHint =>
      t('driverLicenseHintText', fallback: 'Optional for now');

  static String get otpTitle =>
      t('otpTitle', fallback: 'Enter Verification Code');
  static String get otpInputLabel => t('otpCode', fallback: 'OTP code');
  static String get otpInputHint =>
      t('enterSixDigits', fallback: 'Enter 6 digits');
  static const otpDigits = 6;

  static String customerIdentifierLabel(bool useEmail) {
    return useEmail ? customerEmailLabel : customerPhoneLabel;
  }

  static String customerIdentifierHint(bool useEmail) {
    return useEmail ? customerEmailHint : customerPhoneHint;
  }

  static String customerUsedIdentifierLabel(bool isEmail) {
    return isEmail
        ? customerIdentifierEmailUsedLabel
        : customerIdentifierPhoneUsedLabel;
  }

  static String otpSubtitle(String identifier) {
    return tr('otpSentTo',
        params: {'identifier': identifier},
        fallback: 'We sent a $otpDigits-digit code to $identifier.');
  }
}

class AuthRules {
  static bool isEmailIdentifier(String value) => value.contains('@');

  static String? validateCustomerIdentifier(String value) {
    if (value.trim().isEmpty) {
      return t('enterPhoneOrEmail',
          fallback: 'Enter your phone number or email.');
    }
    return null;
  }

  static String? validateDriverPhone(String value) {
    if (value.trim().isEmpty) {
      return t('enterPhoneNumber', fallback: 'Enter your phone number.');
    }
    return null;
  }

  static String? validateOtp(String value) {
    if (value.trim().length != AuthCopy.otpDigits) {
      return t('enterOtpDigits',
          fallback: 'Enter the ${AuthCopy.otpDigits}-digit code.');
    }
    return null;
  }

  static String? validatePassword(String value) {
    final trimmed = value.trim();
    if (trimmed.length != 4) {
      return t('enterMinPassword', fallback: 'Enter a 4-digit PIN.');
    }
    if (!RegExp(r'^\d{4}$').hasMatch(trimmed)) {
      return t('pinDigitsOnly', fallback: 'PIN must contain numbers only.');
    }
    return null;
  }

  static String? validateCustomerFullName(String value) {
    if (value.trim().isEmpty) {
      return t('enterFullName', fallback: 'Enter your full name.');
    }
    return null;
  }

  static String? validateDriverOnboarding({
    required String fullName,
    required String branch,
    required bool isExternal,
    required String partnerCompany,
    bool hasAllRequiredDocuments = true,
  }) {
    if (fullName.trim().isEmpty) {
      return t('enterDriverFullName',
          fallback: 'Enter the driver full name.');
    }
    if (branch.trim().isEmpty) {
      return t('enterDriverBranch', fallback: 'Enter the assigned branch.');
    }
    if (isExternal && partnerCompany.trim().isEmpty) {
      return t('enterPartnerCompany',
          fallback: 'Enter the partner company name.');
    }
    if (!hasAllRequiredDocuments) {
      return 'Attach the required KYC documents.';
    }
    return null;
  }
}
