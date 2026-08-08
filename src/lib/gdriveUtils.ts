/**
 * Meng-extract File ID dari URL Google Drive
 */
export function extractGDriveFileId(url: string): string | null {
  if (!url) return null;

  // Format 1: https://drive.google.com/file/d/FILE_ID/view
  // Format 2: https://drive.google.com/open?id=FILE_ID
  // Format 3: https://drive.google.com/uc?id=FILE_ID
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Mengubah URL pratinjau Google Drive menjadi URL langsung / download
 */
export function getGDriveDirectLink(url: string): string {
  if (!url) return '';
  
  const fileId = extractGDriveFileId(url);
  if (fileId) {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }
  
  return url; // Return original jika bukan format standar
}

/**
 * Mengubah URL Google Drive menjadi URL preview embed / viewer
 */
export function getGDrivePreviewLink(url: string): string {
  if (!url) return '';

  const fileId = extractGDriveFileId(url);
  if (fileId) {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }

  return url;
}
