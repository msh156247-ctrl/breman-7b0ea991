/**
 * Image compression utility
 * Compresses images to be under a specified max file size
 */

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB default
const TARGET_SIZE = 4.5 * 1024 * 1024; // Target slightly under 5MB for safety

interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  initialQuality?: number;
}

/**
 * Compress an image file to be under the specified max size
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Compressed file (or original if already small enough)
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxSizeMB = 5,
    maxWidthOrHeight = 2048,
    initialQuality = 0.9,
  } = options;

  const maxSize = maxSizeMB * 1024 * 1024;
  const targetSize = maxSize * 0.9; // Target 90% of max for safety margin

  // If file is already small enough, return as-is
  if (file.size <= maxSize) {
    return file;
  }

  // Only compress image files
  if (!file.type.startsWith('image/')) {
    throw new Error('파일이 이미지가 아닙니다.');
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context를 생성할 수 없습니다.'));
      return;
    }

    img.onload = async () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        
        if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
          if (width > height) {
            height = (height / width) * maxWidthOrHeight;
            width = maxWidthOrHeight;
          } else {
            width = (width / height) * maxWidthOrHeight;
            height = maxWidthOrHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Determine output type (prefer JPEG for better compression)
        const outputType = file.type === 'image/png' && hasTransparency(ctx, canvas) 
          ? 'image/png' 
          : 'image/jpeg';

        // Try different quality levels to get under target size
        let quality = initialQuality;
        let blob: Blob | null = null;
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
          blob = await new Promise<Blob | null>((res) => {
            canvas.toBlob(res, outputType, quality);
          });

          if (!blob) {
            reject(new Error('이미지 압축에 실패했습니다.'));
            return;
          }

          if (blob.size <= targetSize || quality <= 0.1) {
            break;
          }

          // Reduce quality for next attempt
          quality -= 0.1;
          attempts++;
        }

        if (!blob) {
          reject(new Error('이미지 압축에 실패했습니다.'));
          return;
        }

        // If still too large, reduce dimensions further
        if (blob.size > targetSize) {
          const scale = Math.sqrt(targetSize / blob.size);
          canvas.width = Math.floor(width * scale);
          canvas.height = Math.floor(height * scale);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          blob = await new Promise<Blob | null>((res) => {
            canvas.toBlob(res, outputType, 0.8);
          });
        }

        if (!blob) {
          reject(new Error('이미지 압축에 실패했습니다.'));
          return;
        }

        // Create new file with compressed data
        const extension = outputType === 'image/png' ? 'png' : 'jpg';
        const newFileName = file.name.replace(/\.[^.]+$/, `.${extension}`);
        
        const compressedFile = new File([blob], newFileName, {
          type: outputType,
          lastModified: Date.now(),
        });

        console.log(`Image compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
        resolve(compressedFile);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('이미지를 로드할 수 없습니다.'));
    };

    // Load image from file
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('파일을 읽을 수 없습니다.'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Check if an image has transparency
 */
function hasTransparency(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): boolean {
  try {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Check alpha channel (every 4th value starting from index 3)
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        return true;
      }
    }
    return false;
  } catch {
    // If we can't check (CORS issues, etc.), assume no transparency
    return false;
  }
}

/**
 * Validate and compress image file for upload
 * @param file - The file to process
 * @param maxSizeMB - Maximum file size in MB (default 5)
 * @returns Processed file ready for upload
 */
export async function processImageForUpload(
  file: File,
  maxSizeMB: number = 5
): Promise<File> {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 업로드할 수 있습니다.');
  }

  // Compress if needed
  const processedFile = await compressImage(file, { maxSizeMB });
  
  return processedFile;
}
