export function extractRailwayFileKey(url: string): string | null {
  if (!url || typeof url !== "string") return null;

  if (url.startsWith("/api/media/")) {
    const key = url.slice("/api/media/".length).split("?")[0];
    return key.startsWith("uploads/") ? key : null;
  }

  try {
    const parsed = new URL(url);
    const configuredHost = process.env.RAILWAY_STORAGE_PUBLIC_URL
      ? new URL(process.env.RAILWAY_STORAGE_PUBLIC_URL).hostname
      : null;
    const isRailwayHost = parsed.hostname.endsWith(".storageapi.dev") || parsed.hostname === configuredHost;
    if (!isRailwayHost) return null;

    const uploadsIndex = parsed.pathname.indexOf("/uploads/");
    if (uploadsIndex === -1) return null;
    return parsed.pathname.slice(uploadsIndex + 1);
  } catch {
    return null;
  }
}

export function getPrivateMediaPath(url: string): string | null {
  const fileKey = extractRailwayFileKey(url);
  return fileKey ? `/api/media/${fileKey}` : null;
}

export function isCloudinaryMediaUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" &&
      (parsed.hostname === "res.cloudinary.com" || parsed.hostname.endsWith(".cloudinary.com"));
  } catch {
    return false;
  }
}

export function isMediaUrlAllowedForScope(url: string, scope: string): boolean {
  const fileKey = extractRailwayFileKey(url);
  if (fileKey) return fileKey.startsWith(`uploads/${scope}/`);

  if (!isCloudinaryMediaUrl(url)) return false;
  const decodedPath = decodeURIComponent(new URL(url).pathname);
  const cloudinaryScope = scope.startsWith("users/")
    ? `candyd_memories/${scope.slice("users/".length)}/`
    : `candyd_guest_memories/${scope.slice("guests/".length)}/`;
  return decodedPath.includes(`/${cloudinaryScope}`);
}
