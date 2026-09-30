export const SERVICE_IMAGE_MAX_BYTES = 300 * 1024;
export const SERVICE_IMAGE_TARGET_BYTES = 180 * 1024;
export const SERVICE_IMAGE_MAX_DIMENSION = 800;

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(new Error('Unable to read optimized image'));
  reader.readAsDataURL(blob);
});

const canvasBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', quality));

export async function optimizeServiceImage(file: File): Promise<{ dataUrl: string; bytes: number; width: number; height: number }> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Use a JPG, PNG, or WebP image.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Image must be 10 MB or smaller before processing.');

  const source = await createImageBitmap(file);
  let width = Math.max(1, Math.round(source.width * Math.min(1, SERVICE_IMAGE_MAX_DIMENSION / Math.max(source.width, source.height))));
  let height = Math.max(1, Math.round(source.height * Math.min(1, SERVICE_IMAGE_MAX_DIMENSION / Math.max(source.width, source.height))));
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) { source.close(); throw new Error('Your browser cannot process this image.'); }

  let blob: Blob | null = null;
  let quality = 0.82;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    canvas.width = width; canvas.height = height;
    const draw = canvas.getContext('2d');
    if (!draw) break;
    draw.clearRect(0, 0, width, height);
    draw.drawImage(source, 0, 0, width, height);
    blob = await canvasBlob(canvas, quality);
    if (!blob) break;
    if (blob.size <= SERVICE_IMAGE_TARGET_BYTES) break;
    if (quality > 0.46) quality -= 0.08;
    else { width = Math.max(160, Math.round(width * 0.8)); height = Math.max(160, Math.round(height * 0.8)); }
  }
  source.close();

  if (!blob || blob.size > SERVICE_IMAGE_MAX_BYTES) throw new Error('Unable to reduce this image below 300 KB. Please choose a smaller image.');
  return { dataUrl: await blobToDataUrl(blob), bytes: blob.size, width, height };
}
