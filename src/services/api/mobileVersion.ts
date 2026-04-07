import { getCurrentAppBuildNumber, getCurrentAppVersion } from '../appInfo';

type MobileVersionResponse = Record<string, unknown>;

export type MobileVersionInfo = {
  currentVersion: string;
  currentBuildNumber: string | null;
  latestVersion: string | null;
  latestBuildNumber: string | null;
  minimumSupportedVersion: string | null;
  hasUpdateAvailable: boolean;
  forceUpdate: boolean;
  updateUrl: string | null;
};

function cleanString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readFirstString(source: MobileVersionResponse, keys: string[]): string | null {
  for (const key of keys) {
    const value = cleanString(source[key]);
    if (value) return value;
  }
  return null;
}

function readFirstBoolean(source: MobileVersionResponse, keys: string[]): boolean | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'boolean') return value;
  }
  return null;
}

function compareVersions(left: string, right: string): number {
  const leftParts = left.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = right.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const size = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < size; index += 1) {
    const a = leftParts[index] ?? 0;
    const b = rightParts[index] ?? 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }

  return 0;
}

function compareBuildNumbers(left: string | null, right: string | null): number {
  const a = Number.parseInt(left ?? '', 10);
  const b = Number.parseInt(right ?? '', 10);
  const hasA = Number.isFinite(a);
  const hasB = Number.isFinite(b);
  if (!hasA || !hasB) return 0;
  if (a > b) return 1;
  if (a < b) return -1;
  return 0;
}

function getApiBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_API_BASE_URL || '').trim().replace(/\/+$/, '');
}

function buildVersionInfo(
  payload: MobileVersionResponse,
  currentVersion: string,
  currentBuildNumber: string | null,
): MobileVersionInfo {
  const latestVersion = readFirstString(payload, ['app_version', 'latest_version', 'version']);
  const latestBuildNumber = readFirstString(payload, ['app_build_number', 'build_number']);
  const minimumSupportedVersion = readFirstString(payload, ['minimum_supported_version', 'minimum_version']);
  const explicitForceUpdate = readFirstBoolean(payload, ['force_update', 'update_required']);
  const explicitSupported = readFirstBoolean(payload, ['supported', 'is_supported']);
  const updateUrl = readFirstString(payload, ['update_url', 'store_url', 'app_store_url', 'play_store_url']);

  const belowMinimum =
    !!minimumSupportedVersion && compareVersions(currentVersion, minimumSupportedVersion) < 0;
  const versionBehind = !!latestVersion && compareVersions(currentVersion, latestVersion) < 0;
  const buildBehind =
    !!latestVersion &&
    compareVersions(currentVersion, latestVersion) === 0 &&
    compareBuildNumbers(currentBuildNumber, latestBuildNumber) < 0;
  const hasUpdateAvailable = versionBehind || buildBehind;

  return {
    currentVersion,
    currentBuildNumber,
    latestVersion,
    latestBuildNumber,
    minimumSupportedVersion,
    hasUpdateAvailable,
    forceUpdate: explicitForceUpdate ?? (explicitSupported === false || belowMinimum),
    updateUrl,
  };
}

export const mobileVersionService = {
  hasConfig(): boolean {
    return getApiBaseUrl().length > 0;
  },

  async getVersionInfo(currentVersion = getCurrentAppVersion()): Promise<MobileVersionInfo | null> {
    const currentBuildNumber = getCurrentAppBuildNumber();
    const apiBaseUrl = getApiBaseUrl();
    if (!apiBaseUrl) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(
        `${apiBaseUrl}/api/mobile/version?current_version=${encodeURIComponent(currentVersion)}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          signal: controller.signal,
        },
      );

      const raw = await res.text();
      const payload = raw ? (JSON.parse(raw) as MobileVersionResponse) : {};
      if (!res.ok) {
        throw new Error(
          cleanString((payload as Record<string, unknown>).message) ??
            raw ??
            `Version request failed (${res.status}).`,
        );
      }

      return buildVersionInfo(payload, currentVersion, currentBuildNumber);
    } finally {
      clearTimeout(timeout);
    }
  },
};
