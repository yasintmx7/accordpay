/**
 * Client-side document hashing and verification utilities.
 * Uses the Web Crypto API (SHA-256) — no external dependencies needed.
 */

/**
 * Computes a SHA-256 hash of a File or ArrayBuffer.
 * Returns a lowercase hex string.
 */
export async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Converts a File to a base64 data URI string.
 */
export function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Converts a base64 data URI back to a File object for verification.
 */
export function dataUriToFile(dataUri: string, fileName: string): File {
  const [header, base64] = dataUri.split(',');
  const mimeMatch = header.match(/data:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], fileName, { type: mime });
}

/**
 * Validates file type and size.
 * Returns an error message or null if valid.
 */
export function validateDocument(file: File): string | null {
  const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
  const ALLOWED_TYPES = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
  ];

  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Only PDF, PNG, JPEG, and WebP files are allowed.';
  }
  if (file.size > MAX_SIZE) {
    return 'File size must be under 10 MB.';
  }
  if (file.size === 0) {
    return 'File appears to be empty.';
  }
  return null;
}

/**
 * Formats a file size in bytes to a human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
