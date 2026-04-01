enum DriverAppEnvironment { local, stage, production }

class DriverAppConfig {
  static const String apiUrl = String.fromEnvironment(
    'TIKUR_ABAY_API_URL',
    defaultValue: 'http://localhost:6012/api/v1',
  );

  static const String environmentName = String.fromEnvironment(
    'TIKUR_ABAY_APP_ENV',
    defaultValue: 'local',
  );

  static DriverAppEnvironment get environment {
    switch (environmentName) {
      case 'stage':
        return DriverAppEnvironment.stage;
      case 'production':
        return DriverAppEnvironment.production;
      default:
        return DriverAppEnvironment.local;
    }
  }

  static String get environmentLabel {
    switch (environment) {
      case DriverAppEnvironment.stage:
        return 'Stage';
      case DriverAppEnvironment.production:
        return 'Production';
      case DriverAppEnvironment.local:
        return 'Local';
    }
  }

  static bool get showEnvironmentBadge => environment != DriverAppEnvironment.production;
}
