type ExpoConfig = {
  expo?: {
    version?: string;
    ios?: {
      buildNumber?: string;
    };
    android?: {
      versionCode?: number;
    };
  };
};

const appConfig = require('../../app.json') as ExpoConfig;

function cleanString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export function getCurrentAppVersion(): string {
  return cleanString(appConfig?.expo?.version) ?? '1.0.0';
}

export function getCurrentAppBuildNumber(): string | null {
  const iosBuild = cleanString(appConfig?.expo?.ios?.buildNumber);
  if (iosBuild) return iosBuild;
  const androidBuild = appConfig?.expo?.android?.versionCode;
  return typeof androidBuild === 'number' ? String(androidBuild) : null;
}

export function getCurrentAppVersionLabel(): string {
  const version = getCurrentAppVersion();
  const buildNumber = getCurrentAppBuildNumber();
  return buildNumber ? `v${version} (Build ${buildNumber})` : `v${version}`;
}
