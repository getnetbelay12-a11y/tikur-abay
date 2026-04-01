import 'dart:math';

class DemoFieldDefaults {
  DemoFieldDefaults._({
    required this.fullName,
    required this.phone,
    required this.email,
    required this.companyName,
    required this.city,
    required this.branch,
    required this.emergencyName,
    required this.emergencyPhone,
    required this.licenseNumber,
    required this.partnerCompany,
  });

  final String fullName;
  final String phone;
  final String email;
  final String companyName;
  final String city;
  final String branch;
  final String emergencyName;
  final String emergencyPhone;
  final String licenseNumber;
  final String partnerCompany;

  static final Random _random = Random();

  static const List<String> _firstNames = [
    'Abel',
    'Bethlehem',
    'Dawit',
    'Eden',
    'Henok',
    'Hiwot',
    'Kaleb',
    'Liya',
    'Meron',
    'Natnael',
    'Rahel',
    'Samrawit',
    'Selam',
    'Tigist',
    'Yared',
  ];

  static const List<String> _lastNames = [
    'Abebe',
    'Alemu',
    'Assefa',
    'Bekele',
    'Belay',
    'Demissie',
    'Gebre',
    'Kebede',
    'Mekonnen',
    'Tadesse',
    'Tesfaye',
    'Wolde',
  ];

  static const List<String> _cities = [
    'Addis Ababa',
    'Adama',
    'Dire Dawa',
    'Modjo',
    'Kombolcha',
  ];

  static const List<String> _companyPrefixes = [
    'Abay',
    'Blue Nile',
    'Ethio',
    'Selam',
    'Sheger',
    'Tana',
  ];

  static const List<String> _companySuffixes = [
    'Logistics',
    'Freight',
    'Trading',
    'Transport',
    'Cargo',
    'Distribution',
  ];

  static DemoFieldDefaults generate({String? roleLabel}) {
    final firstName = _firstNames[_random.nextInt(_firstNames.length)];
    final lastName = _lastNames[_random.nextInt(_lastNames.length)];
    final fullName = '$firstName $lastName';
    final city = _cities[_random.nextInt(_cities.length)];
    final companyName =
        '${_companyPrefixes[_random.nextInt(_companyPrefixes.length)]} ${_companySuffixes[_random.nextInt(_companySuffixes.length)]}';
    final phone = _phone();
    final emergencyFirstName = _firstNames[_random.nextInt(_firstNames.length)];
    final emergencyLastName = _lastNames[_random.nextInt(_lastNames.length)];
    final safeRole = (roleLabel ?? 'demo').toLowerCase().replaceAll(' ', '');

    return DemoFieldDefaults._(
      fullName: fullName,
      phone: phone,
      email:
          '${firstName.toLowerCase()}.${lastName.toLowerCase()}.${_random.nextInt(9000) + 1000}@$safeRole.tikurabay.local',
      companyName: companyName,
      city: city,
      branch: city,
      emergencyName: '$emergencyFirstName $emergencyLastName',
      emergencyPhone: _phone(),
      licenseNumber: 'LIC-${_random.nextInt(900000) + 100000}',
      partnerCompany: '$companyName Partner',
    );
  }

  static String _phone() =>
      '+2519${_random.nextInt(90000000) + 10000000}';
}
