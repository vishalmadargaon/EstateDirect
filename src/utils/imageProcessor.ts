import { validateImageFile } from './realEstateLogic';

/**
 * Resizes an uploaded image file client-side to a max dimension of 1600px
 * and encodes as WebP (with JPEG fallback) for fast storage and delivery.
 */
export async function processPropertyImage(
  file: File,
  currentCount: number,
  maxDimension: number = 1600
): Promise<string> {
  const err = validateImageFile({ type: file.type, size: file.size }, currentCount);
  if (err) {
    throw new Error(err);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid or corrupted image file.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas compression unavailable in this browser.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        const webpData = canvas.toDataURL('image/webp', 0.84);
        if (webpData.startsWith('data:image/webp')) {
          resolve(webpData);
        } else {
          resolve(canvas.toDataURL('image/jpeg', 0.86));
        }
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}
