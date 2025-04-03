// Types
import type { BufferObject, UrlRequestObject } from "image-hash";

// Libraries
import { exec } from "child_process";
import { createHash } from "crypto";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import isImage from "is-image";
import sharp from "sharp";
import { imageHash } from "image-hash";
import { getFileHash } from "./hash";

// Constants
import { CACHE_DIR, UNSUPPORTED_IMG_FORMATS } from "@/constants";

const execAsync = promisify(exec);

/**
 * Checks if the given file is an image
 *
 * @param fullPath string - The path of the file to check
 * @returns boolean - If the file is an image or not
 */
export const getIsImage = (fullPath: string) => {
  const fileExtension = path.extname(fullPath).toLowerCase();
  return !UNSUPPORTED_IMG_FORMATS.includes(fileExtension) && isImage(fullPath);
};

/**
 * Checks if file is type HEIC
 *
 * @param imagePath string - The path of the image to check
 * @returns boolean - If the file is type HEIC or not
 */
export const getIsFileHeic = async (imagePath: string) => {
  const metadata = await sharp(imagePath).metadata();
  const isHeicFile =
    metadata.format && ["heic", "heif"].includes(metadata.format);

  return isHeicFile;
};

/**
 * Convert HEIC to JPEG using external tools (ImageMagick or sips on macOS)
 *
 * @param imagePath string - The path of the image to convert
 * @returns Promise<Buffer> - The processed image converted, resized and compressed
 */
export const convertHeicToJpegBuffer = async (
  imagePath: string
): Promise<Buffer> => {
  try {
    const tempDir = path.dirname(imagePath);
    const tempFileName = `temp_${Date.now()}.jpg`;
    const tempFilePath = path.join(tempDir, tempFileName);

    try {
      // Try to detect OS and use appropriate conversion tool
      const platform = process.platform;

      if (platform === "darwin") {
        // On macOS, use sips (built-in)
        await execAsync(
          `sips -s format jpeg "${imagePath}" --out "${tempFilePath}" --resampleWidth 300`,
          { timeout: 10000 }
        );
      } else {
        // On other platforms, try ImageMagick
        await execAsync(
          `magick convert "${imagePath}" -resize 300x "${tempFilePath}"`,
          { timeout: 10000 }
        );
      }

      const jpegBuffer = await fs.promises.readFile(tempFilePath);

      // We're puting the image in the cache folder to avoid doing it the next time
      const folderPathCache = path.join(path.dirname(imagePath), CACHE_DIR);
      if (!fs.existsSync(folderPathCache)) {
        fs.mkdirSync(folderPathCache, { recursive: true });
      }
      fs.writeFileSync(
        path.join(folderPathCache, `${path.parse(imagePath).name}.jpg`),
        jpegBuffer
      );

      const standardizedBuffer = await sharp(jpegBuffer)
        .resize(200, 200, { fit: "inside", withoutEnlargement: true })
        .grayscale()
        .jpeg({ quality: 85 })
        .toBuffer();

      // Clean up
      await fs.promises.unlink(tempFilePath).catch(() => {});

      return standardizedBuffer;
    } catch (error) {
      console.error(`External conversion failed: ${error}`);

      const stats = fs.statSync(imagePath);
      const hash = createHash("md5");
      hash.update(`${stats.size}-${imagePath}`);

      return Buffer.from(hash.digest("hex"));
    }
  } catch (error) {
    console.error(`HEIC conversion error: ${error}`);
    throw error;
  }
};

/**
 * Preprocess image for consistent hashing across formats (for non-HEIC images)
 *
 * @param imagePath string - The path of the image
 * @returns Promise<Buffer> - The buffer of the image compressed and resized
 */
export const preprocessImageForHashing = async (
  imagePath: string
): Promise<Buffer> => {
  try {
    // Standardize image for consistent hashing
    return await sharp(imagePath, { failOnError: false })
      .resize({
        width: 200,
        height: 200,
        fit: "inside",
        withoutEnlargement: true,
      })
      .grayscale()
      .removeAlpha()
      .jpeg({
        quality: 80,
        chromaSubsampling: "4:4:4",
      })
      .toBuffer();
  } catch (error) {
    console.error(`Error preprocessing image ${imagePath}:`, error);
    throw error;
  }
};

/**
 * Enhanced image hash calculation that works across formats including HEIC
 *
 * @param imagePath string - The path of the image
 * @returns Promise<{string, string}> - A promise with the perceptual hash of the image and the image type
 */
export const calculateImageHash = async (
  imagePath: string
): Promise<{
  hash: string;
  imageType?: string;
}> => {
  try {
    const isFileHeic = await getIsFileHeic(imagePath);
    let imageBuffer: Buffer;

    if (isFileHeic) {
      const pathCache = path.join(path.dirname(imagePath), CACHE_DIR);
      const fileNameInCache = `${path.parse(imagePath).name}.jpg`;
      const cacheImagePath = path.join(pathCache, fileNameInCache);
      const fileInCache = fs.existsSync(cacheImagePath);
      if (fileInCache) {
        // If the file already exists in cache, use it instead of converting the heic again
        imageBuffer = await preprocessImageForHashing(cacheImagePath);
      } else {
        // For HEIC/HEIF files, create a temporary JPEG using ImageMagick or sips
        imageBuffer = await convertHeicToJpegBuffer(imagePath);
      }
    } else {
      // For other image formats, use sharp directly
      imageBuffer = await preprocessImageForHashing(imagePath);
    }

    const metadata = await sharp(imagePath).metadata();

    if (imageBuffer) {
      // Calculate perceptual hash
      const hash = (await getImageHashAsync(
        { data: imageBuffer },
        16,
        true
      )) as unknown as string;
      return {
        hash,
        imageType: metadata.format,
      };
    }

    // Fallback to file hash
    return {
      hash: await getFileHash(imagePath),
      imageType: metadata.format,
    };
  } catch (error) {
    console.error(`Error calculating image hash for ${imagePath}:`, error);
    return {
      hash: await getFileHash(imagePath),
    };
  }
};

/**
 * Makes the imageHash method async
 */
export const getImageHashAsync = promisify(
  (
    options: string | UrlRequestObject | BufferObject,
    bits: number,
    binary: boolean,
    callback: () => void
  ) => {
    imageHash(options, bits, binary, callback);
  }
);
