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
  const scale = Math.min(1, SERVICE_IMAGE_MAX_DIMENSION / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser cannot process this image.');
  context.drawImage(source, 0, 0, width, height);
  source.close();

  let quality = 0.82;
  let blob = await canvasBlob(canvas, quality);
  if (!blob) throw new Error('Unable to compress image.');

  while (blob.size > SERVICE_IMAGE_TARGET_BYTES && quality > 0.42) {
    quality -= 0.08;
    blob = await canvasBlob(canvas, quality);
    if (!blob) throw new Error('Unable to compress image.');
  }

  if (blob.size > SERVICE_IMAGE_MAX_BYTES) {
    const smallerScale = Math.min(0.75, Math.sqrt(SERVICE_IMAGE_MAX_BYTES / blob.size));
    canvas.width = Math.max(240, Math.round(width * smallerScale));
    canvas.height = Math.max(240, Math.round(height * smallerScale));
    const retryContext = canvas.getContext('2d');
    if (!retryContext) throw new Error('Your browser cannot process this image.');
    retryContext.drawImage(document.createElement('canvas'), 0, 0);
    const sourceAgain = await createImageBitmap(file);
    retryContext.drawImage(sourceAgain, 0, 0, canvas.width, canvas.height);
    sourceAgain.close();
    blob = await canvasBlob(canvas, 0.5);
  }

  if (!blob || blob.size > SERVICE_IMAGE_MAX_BYTES) throw new Error('Unable to reduce this image below 300 KB. Please choose a smaller image.');
  return { dataUrl: await blobToDataUrl(blob), bytes: blob.size, width: canvas.width, height: canvas.height };
}
