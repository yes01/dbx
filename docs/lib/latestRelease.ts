import { requestJson } from '@/lib/httpJson';
import { browserCacheBuster, createUncachedUrl, releaseMetadataRequestInit } from '@/lib/releaseMetadataRequest';

export type LatestReleaseInfo = {
  version: string;
  notes?: string;
  pub_date?: string;
};

const LATEST_RELEASE_URL = 'https://github.com/yes01/dbx/releases/latest/download/latest.json';

function normalizeVersion(version: string) {
  return version.replace(/^v/, '');
}

export async function fetchLatestReleaseInfo(): Promise<LatestReleaseInfo | null> {
  try {
    const release = await requestJson<LatestReleaseInfo>(
      createUncachedUrl(LATEST_RELEASE_URL, browserCacheBuster()),
      releaseMetadataRequestInit(),
    );
    return release.version ? { ...release, version: normalizeVersion(release.version) } : null;
  } catch {
    return null;
  }
}
