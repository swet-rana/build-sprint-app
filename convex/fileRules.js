export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const FILE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

/** @param {string} key */
export function isSessionKey(key) {
  return /^[a-f0-9]{64}$/.test(key);
}

/** @param {number} size @param {string} type */
export function fileError(size, type) {
  if (!FILE_TYPES.includes(type)) return "Choose a PDF, JPG, PNG or WebP file.";
  if (size === 0) return "This file is empty. Choose another report.";
  if (size > MAX_FILE_SIZE) return "This file is larger than 10 MB. Choose a smaller copy.";
  return null;
}

/** @param {Uint8Array} bytes @param {string} type */
export function matchesFileType(bytes, type) {
  const matches = (/** @type {number[]} */ signature, offset = 0) =>
    signature.every((byte, index) => bytes[offset + index] === byte);
  if (type === "application/pdf") return matches([37, 80, 68, 70, 45]);
  if (type === "image/jpeg") return matches([255, 216, 255]);
  if (type === "image/png") return matches([137, 80, 78, 71, 13, 10, 26, 10]);
  if (type === "image/webp") return matches([82, 73, 70, 70]) && matches([87, 69, 66, 80], 8);
  return false;
}
