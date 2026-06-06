// biome-ignore-all lint/security/noSecrets: Japanese fallback UI text is a false positive.

interface ClipLike {
  service?: string | null;
}

export function formatDateJa(value: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function collectSubscriptionServices(clips: ClipLike[]): string[] {
  return Array.from(
    new Set(
      clips
        .map((clip) => clip.service)
        .filter((service): service is string => typeof service === "string")
        .map((service) => service.trim())
        .filter(Boolean),
    ),
  );
}

export function formatSubscriptionLabel(services: string[]): string {
  return services.length > 0 ? services.join(" / ") : "未連携（仮表示）";
}
