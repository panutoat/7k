// Helpers for turning a Google Drive share link (or any image URL) into
// something that actually renders / downloads as an image.

/** Extract the Drive file id from the common share-link shapes. */
export function parseDriveId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/, // .../file/d/<id>/view
    /[?&]id=([a-zA-Z0-9_-]+)/, //      ...?id=<id> / uc?export=...&id=<id>
    /\/d\/([a-zA-Z0-9_-]+)/, //        .../d/<id>
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

/**
 * A URL that can be dropped straight into an <img src> for preview.
 * Drive links become the public thumbnail endpoint; other URLs pass through.
 */
export function toDirectImageUrl(url: string): string {
  const id = parseDriveId(url.trim());
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1000` : url.trim();
}

/**
 * Ordered list of URLs to try when downloading the image server-side.
 * Drive is finicky, so we try a few host shapes before giving up.
 */
export function imageDownloadCandidates(url: string): string[] {
  const id = parseDriveId(url.trim());
  if (!id) return [url.trim()];
  return [
    `https://drive.google.com/thumbnail?id=${id}&sz=w1000`,
    `https://lh3.googleusercontent.com/d/${id}=w1000`,
    `https://drive.google.com/uc?export=download&id=${id}`,
  ];
}
