export type InstallLang = "en" | "cn";

export type InstallOption = {
  id: string;
  label: string;
  href: string;
};

type DownloadArtifact = {
  id: string;
  labels: Record<InstallLang, string>;
  suffix: string;
};

const DOWNLOAD_BASE_URL = "https://github.com/yes01/dbx/releases/latest/download";

const downloadArtifacts: DownloadArtifact[] = [
  {
    id: "macos-arm",
    labels: { en: "For macOS (Apple Silicon)", cn: "适用于 macOS (Apple Silicon)" },
    suffix: "aarch64.dmg",
  },
  {
    id: "windows",
    labels: { en: "For Windows", cn: "适用于 Windows" },
    suffix: "x64-setup.exe",
  },
];

export function createInstallOptions(lang: InstallLang, version: string): InstallOption[] {
  return downloadArtifacts.map((artifact) => ({
    id: artifact.id,
    label: artifact.labels[lang],
    href: `${DOWNLOAD_BASE_URL}/TestTeam.DBX_${version}_${artifact.suffix}`,
  }));
}
