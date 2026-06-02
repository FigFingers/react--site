type DisplayNameUser = {
  id?: string | null;
  name?: string | null;
  nickname?: string | null;
  email?: string | null;
};

function normalizeText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveCurrentUserDisplayName(
  user: DisplayNameUser | null | undefined,
) {
  return (
    normalizeText(user?.nickname) ??
    normalizeText(user?.name) ??
    normalizeText(user?.email) ??
    normalizeText(user?.id) ??
    "unknown"
  );
}
