/**
 * Client-side image optimization utilities
 * Resizes large images before upload to save bandwidth and storage
 */

export interface OptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputFormat?: "image/jpeg" | "image/png" | "image/webp";
}

const DEFAULT_OPTIONS: Required<OptimizationOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.85,
  outputFormat: "image/jpeg",
};

/**
 * Optimizes an image by resizing and compressing it
 * Returns the original file if it's not an image or already small enough
 */
export async function optimizeImage(
  file: File,
  options: OptimizationOptions = {}
): Promise<File> {
  // Only process images
  if (!file.type.startsWith("image/")) {
    return file;
  }

  // Don't process SVGs or GIFs (would lose quality/animation)
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    return file;
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    const img = await loadImage(file);

    // Check if resizing is needed
    if (img.width <= opts.maxWidth && img.height <= opts.maxHeight) {
      // Image is small enough, just compress if it's large
      if (file.size <= 500 * 1024) {
        return file; // Under 500KB, keep original
      }
    }

    // Calculate new dimensions
    const { width, height } = calculateDimensions(
      img.width,
      img.height,
      opts.maxWidth,
      opts.maxHeight
    );

    // Create canvas and draw resized image
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    // Use high-quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(img, 0, 0, width, height);

    // Convert to blob
    const blob = await canvasToBlob(canvas, opts.outputFormat, opts.quality);

    // Create new file with same name but potentially different extension
    const extension = opts.outputFormat.split("/")[1];
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const newFileName = `${baseName}.${extension}`;

    return new File([blob], newFileName, { type: opts.outputFormat });
  } catch (error) {
    console.error("Image optimization failed, using original:", error);
    return file;
  }
}

/**
 * Optimize image specifically for avatars (smaller dimensions)
 */
export async function optimizeAvatar(file: File): Promise<File> {
  return optimizeImage(file, {
    maxWidth: 512,
    maxHeight: 512,
    quality: 0.9,
    outputFormat: "image/jpeg",
  });
}

/**
 * Optimize image for social feed posts
 */
export async function optimizeFeedImage(file: File): Promise<File> {
  return optimizeImage(file, {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.85,
    outputFormat: "image/jpeg",
  });
}

/**
 * Optimize image for course/admin media (higher quality)
 */
export async function optimizeMediaImage(file: File): Promise<File> {
  return optimizeImage(file, {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.9,
    outputFormat: "image/jpeg",
  });
}

// Helper: Load image from file
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load image"));
    };
    img.src = URL.createObjectURL(file);
  });
}

// Helper: Calculate new dimensions maintaining aspect ratio
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;

  // Scale down to fit within max dimensions
  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }

  if (height > maxHeight) {
    width = Math.round((width * maxHeight) / height);
    height = maxHeight;
  }

  return { width, height };
}

// Helper: Convert canvas to blob
function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob from canvas"));
        }
      },
      type,
      quality
    );
  });
}
