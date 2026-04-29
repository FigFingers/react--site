export function formatDateJa(value) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function collectSubscriptionServices(clips) {
  return Array.from(
    new Set(
      clips
        .map((clip) => clip.service)
        .filter((service) => typeof service === "string")
        .map((service) => service.trim())
        .filter(Boolean),
    ),
  );
}

export function formatSubscriptionLabel(services) {
  return services.length > 0 ? services.join(" / ") : "未連携（仮表示）";
}
