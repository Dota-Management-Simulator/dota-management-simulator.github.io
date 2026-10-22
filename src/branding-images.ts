import { MAX_LOGO_LENGTH, paletteFromPixels } from "./branding";

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("That image could not be opened. Try a PNG, JPEG or WebP file."));
    image.src = url;
  });
}
export async function colorsFromImage(url: string) {
  const image = await loadImage(url);
  const canvas = document.createElement("canvas"); canvas.width = 64; canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) return undefined;
  context.drawImage(image, 0, 0, 64, 64);
  return paletteFromPixels(context.getImageData(0, 0, 64, 64).data);
}
/** Decode and re-encode local pixels; never persist an external URL or original file. */
export async function importClubLogo(file: File) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Choose a PNG, JPEG or WebP image.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Choose an image smaller than 5 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 40000000)
      throw new Error("That image is too large. Choose one under 40 megapixels.");
    const canvas = document.createElement("canvas");
    for (const size of [256, 192, 128]) {
      canvas.width = size; canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Your browser could not prepare the image.");
      const scale = Math.min(size / image.naturalWidth, size / image.naturalHeight);
      const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
      context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
      const dataUrl = canvas.toDataURL("image/webp", .85);
      if (dataUrl.length <= MAX_LOGO_LENGTH) {
        const palette = paletteFromPixels(context.getImageData(0, 0, size, size).data);
        return { dataUrl, palette };
      }
    }
    throw new Error("That image could not be made small enough to save. Try a simpler logo.");
  } finally { URL.revokeObjectURL(url); }
}
