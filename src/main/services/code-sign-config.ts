export interface CodeSignConfigProvider {
  isSigningConfigured(): boolean;
}

export class EnvironmentCodeSignConfigProvider implements CodeSignConfigProvider {
  isSigningConfigured(): boolean {
    return Boolean(
      process.env.APPLE_ID &&
        process.env.APPLE_APP_PASSWORD &&
        process.env.APPLE_TEAM_ID &&
        process.env.CSC_LINK &&
        process.env.CSC_KEY_PASSWORD
    );
  }
}

