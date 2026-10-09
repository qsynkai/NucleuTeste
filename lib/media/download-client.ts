function extensionFromMime(mime: string): string {
  if (mime.includes("png")) return ".png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return ".jpg";
  if (mime.includes("webp")) return ".webp";
  if (mime.includes("gif")) return ".gif";
  if (mime.includes("mp4")) return ".mp4";
  if (mime.includes("webm")) return ".webm";
  return "";
}

function extensionFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.[a-zA-Z0-9]+$/);
    return match?.[0] ?? "";
  } catch {
    return "";
  }
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export async function downloadMediaUrl(
  url: string,
  filenameBase: string,
  index: number,
): Promise<void> {
  const fallbackName = `${filenameBase}-${index + 1}`;

  if (url.startsWith("data:")) {
    const response = await fetch(url);
    const blob = await response.blob();
    const ext = extensionFromMime(blob.type) || ".bin";
    triggerBlobDownload(blob, `${fallbackName}${ext}`);
    return;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Não foi possível baixar a mídia.");
  }

  const blob = await response.blob();
  const ext =
    extensionFromMime(blob.type) ||
    extensionFromUrl(url) ||
    (blob.type.startsWith("video/") ? ".mp4" : ".jpg");

  triggerBlobDownload(blob, `${fallbackName}${ext}`);
}

export function isVideoUrl(url: string): boolean {
  if (url.startsWith("data:video/")) return true;
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

export function isImageUrl(url: string): boolean {
  if (url.startsWith("data:image/")) return true;
  return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url);
}
