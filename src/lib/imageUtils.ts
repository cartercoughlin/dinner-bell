const MAX_WIDTH = 1200;
const JPEG_QUALITY = 0.82;
const MAX_BYTES = 900_000;

/** Resize and compress an image file for storage in imageUrl (data URL). */
export async function fileToCoverImageDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      const scale = Math.min(1, MAX_WIDTH / img.width);
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not process image'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    };

    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error('Could not read image'));
    };

    img.src = blobUrl;
  });

  const approxBytes = Math.ceil((dataUrl.length * 3) / 4);
  if (approxBytes > MAX_BYTES) {
    throw new Error('Image is too large — try a smaller photo');
  }

  return dataUrl;
}
