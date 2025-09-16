import { config } from '../config';

export interface ImageMetadata {
  size: number;
  type: string;
  width?: number;
  height?: number;
}

export class ImageProcessor {
  static validateImage(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > config.image.maxSize) {
      return {
        valid: false,
        error: `Image size exceeds maximum allowed size of ${config.image.maxSize / 1024 / 1024}MB`,
      };
    }

    // Check file type
    if (!config.image.allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Image type ${file.type} is not allowed. Allowed types: ${config.image.allowedTypes.join(', ')}`,
      };
    }

    return { valid: true };
  }

  static async compressImage(file: File, maxWidth = 1024, maxHeight = 1024, quality = 0.8): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        const { width, height } = img;

        // Avoid upscaling - only compress if image is larger than target
        const shouldResize = width > maxWidth || height > maxHeight;

        if (!shouldResize) {
          // Convert to base64 without resizing
          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0);
          resolve(canvas.toDataURL(file.type, quality));
          return;
        }

        // Calculate new dimensions maintaining aspect ratio
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        canvas.width = width * ratio;
        canvas.height = height * ratio;

        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL(file.type, quality));
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  static generateImageHash(imageData: string): string {
    // Simple hash function for image deduplication
    let hash = 0;
    for (let i = 0; i < imageData.length; i++) {
      const char = imageData.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  static extractImageMetadata(file: File): ImageMetadata {
    return {
      size: file.size,
      type: file.type,
    };
  }
}