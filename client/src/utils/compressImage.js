// Phone photos and scans are often several MB; they are re-encoded as a
// smaller JPEG in the browser before upload so they fit the 1 MB document
// limit. PDFs and office files are returned unchanged.
const COMPRESSIBLE_TYPES = ["image/jpeg", "image/png"];
// Below this size a picture is already small enough to keep as it is.
const COMPRESS_ABOVE_BYTES = 300 * 1024;
// Longest side after resizing - still readable for printed invoices / LRs.
const MAX_IMAGE_DIMENSION = 1800;
const JPEG_QUALITY = 0.75;

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = (error) => {
      URL.revokeObjectURL(url);
      reject(error);
    };
    image.src = url;
  });

const toJpegName = (fileName) => `${String(fileName).replace(/\.[^.]+$/, "")}.jpg`;

const scaleToFit = (width, height) => {
  const ratio = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
};

/**
 * Returns a smaller JPEG copy of a large JPG / PNG, else the file itself
 * (also when compressing would not make it smaller or the browser cannot
 * read the picture).
 * @param {File} file
 * @returns {Promise<File>}
 */
export const compressImageFile = async (file) => {
  if (!file || !COMPRESSIBLE_TYPES.includes(file.type) || file.size <= COMPRESS_ABOVE_BYTES) return file;
  try {
    const image = await loadImage(file);
    const { width, height } = scaleToFit(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    // White background so transparent PNG areas do not turn black.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], toJpegName(file.name), { type: "image/jpeg", lastModified: Date.now() });
  } catch (error) {
    console.warn("Image compression skipped", error);
    return file;
  }
};
