// Libraries
import { createHash } from "crypto";
import { createReadStream } from "fs";

/**
 * Calculate hash for non-image files
 *
 * @param filePath string - Path of the file
 * @param algorithm string - Algorithm to use for the hashing
 * @returns Promise<string> - The hash in string format
 */
export const getFileHash = (
  filePath: string,
  algorithm = "sha256"
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const hash = createHash(algorithm);
    const stream = createReadStream(filePath);
    stream.on("data", (data) => hash.update(data));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", (err) => reject(err));
  });
};

/**
 * Calculate Hamming distance between two binary hashes
 *
 * @param hash1 string - Hash of the first file
 * @param hash2 string - Hash of the second file
 * @returns number - Similarity rate between 0 and 1 (where 1 is 100% identical)
 */
export const calculateHashSimilarity = (hash1: string, hash2: string): number => {
  if (hash1.length !== hash2.length) {
    return 0;
  }

  let matchingBits = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] === hash2[i]) {
      matchingBits++;
    }
  }

  return matchingBits / hash1.length;
};
