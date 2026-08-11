export const MEDIA_LIMITS = {
  image: 20 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
  video: 250 * 1024 * 1024,
} as const;

const MEDIA_MIME_TYPES = {
  image: new Set([
    "image/avif",
    "image/bmp",
    "image/gif",
    "image/heic",
    "image/heif",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/x-ms-bmp",
  ]),
  audio: new Set([
    "audio/aac",
    "audio/flac",
    "audio/m4a",
    "audio/mp3",
    "audio/mp4",
    "audio/mpeg",
    "audio/ogg",
    "audio/wav",
    "audio/webm",
    "audio/x-m4a",
    "audio/x-wav",
  ]),
  video: new Set([
    "video/mp4",
    "video/mpeg",
    "video/ogg",
    "video/quicktime",
    "video/3gpp",
    "video/webm",
    "video/x-m4v",
  ]),
} as const;

export type MediaKind = keyof typeof MEDIA_MIME_TYPES;

export function isMediaKind(value: unknown): value is MediaKind {
  return value === "image" || value === "audio" || value === "video";
}

export function getMediaKind(contentType: string): MediaKind | null {
  const normalized = contentType.toLowerCase().split(";")[0].trim();

  for (const kind of Object.keys(MEDIA_MIME_TYPES) as MediaKind[]) {
    if (MEDIA_MIME_TYPES[kind].has(normalized as never)) return kind;
  }

  return null;
}

export function validateMediaMetadata(contentType: string, size: number) {
  const kind = getMediaKind(contentType);
  if (!kind) {
    return { valid: false as const, error: "Unsupported media type" };
  }

  if (!Number.isFinite(size) || size <= 0) {
    return { valid: false as const, error: "The selected file is empty" };
  }

  if (size > MEDIA_LIMITS[kind]) {
    const maxMb = MEDIA_LIMITS[kind] / (1024 * 1024);
    return { valid: false as const, error: `${kind} files must be ${maxMb} MB or smaller` };
  }

  return { valid: true as const, kind };
}

export function validateMediaFile(file: File) {
  return validateMediaMetadata(file.type, file.size);
}
