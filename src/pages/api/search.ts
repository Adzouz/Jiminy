// Types
import type { FileType, HashGroup } from "@/types";
import type { NextApiRequest, NextApiResponse } from "next";

// Libraries
import fs from "fs";
import path from "path";
import { calculateImageHash, getIsImage } from "@/utils/image";
import { calculateHashSimilarity, getFileHash } from "@/utils/hash";

// Constants
import { CACHE_DIR, SIMILARITY_THRESHOLD } from "@/constants";

/**
 * Gets all files recursively from directories and groups them by hash (recursively)
 *
 * @param dirPath string - The path of the directory to check
 * @param folderPathsToExclude string[] - List of the folders we want to exclude from the process
 * @param filesGroups Record<string, FileType[]> - The reference of the value that will be used in the return of the api query
 * @param abortSignal AbortSignal - The abort signal to stop the process if triggered by the client
 */
const getAllFiles = async (
  dirPath: string,
  folderPathsToExclude: string[],
  filesGroups: Record<string, FileType[]>,
  abortSignal: AbortSignal
) => {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (abortSignal.aborted) {
        return;
      }
      if (
        !folderPathsToExclude.includes(dirPath) &&
        !dirPath.includes(CACHE_DIR)
      ) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          await getAllFiles(
            fullPath,
            folderPathsToExclude,
            filesGroups,
            abortSignal
          );
        } else if (entry.isFile() && entry.name.charAt(0) !== ".") {
          const fileExtension = path.extname(fullPath).toLowerCase();
          const fileIsImage = getIsImage(fullPath);
          const fileInfo: FileType = {
            size: fs.statSync(fullPath).size,
            name: path.basename(fullPath),
            extension: fileExtension,
            fullPath,
            isImage: fileIsImage,
          };

          let fileHash;
          if (fileIsImage) {
            const { hash, imageType } = await calculateImageHash(fullPath);
            fileHash = hash;
            fileInfo.imageType = imageType;
          } else {
            fileHash = await getFileHash(fullPath);
          }

          if (abortSignal.aborted) return;

          // Add file to appropriate group
          if (!filesGroups[fileHash]) {
            filesGroups[fileHash] = [];
          }
          console.log(fileHash, fullPath);

          filesGroups[fileHash].push(fileInfo);
        }
      }
    }
  } catch (error) {
    if (abortSignal.aborted) {
      console.error("Aborted due to client cancel");
    } else {
      console.error("Error while reading directory:", error);
    }
  }
};

/**
 * Group similar images based on hash similarity
 *
 * @param filesGroups Record<string, FileType[]> - The list of all files processed and grouped by hash
 * @param similarityThreshold number - The threshold for accepting similarity between two files (between 0 and 1, 1 if we want absolute identical files)
 * @returns Record<string, FileType[]> - The files grouped by similarity
 */
const groupSimilarImages = (
  filesGroups: Record<string, FileType[]>,
  similarityThreshold: number = SIMILARITY_THRESHOLD
): Record<string, FileType[]> => {
  const hashGroups: HashGroup[] = [];

  // First, create initial groups from exact matches
  Object.entries(filesGroups).forEach(([hash, files]) => {
    // Only process image files for similarity
    const imageFiles = files.filter((file) => file.isImage);
    const nonImageFiles = files.filter((file) => !file.isImage);

    if (imageFiles.length > 0) {
      hashGroups.push({
        primaryHash: hash,
        files: [...imageFiles],
      });
    }

    // Keep non-image files in their original groups
    if (nonImageFiles.length > 0) {
      if (nonImageFiles.length > 1) {
        hashGroups.push({
          primaryHash: hash,
          files: [...nonImageFiles],
        });
      }
    }
  });

  // Now merge similar groups
  const mergedGroups: HashGroup[] = [];
  const processedGroups = new Set<number>();

  for (let i = 0; i < hashGroups.length; i++) {
    if (processedGroups.has(i)) continue;

    const currentGroup = hashGroups[i];
    const mergedGroup: HashGroup = {
      primaryHash: currentGroup.primaryHash,
      files: [...currentGroup.files],
    };

    processedGroups.add(i);

    // Check other groups for similarity
    for (let j = i + 1; j < hashGroups.length; j++) {
      if (processedGroups.has(j)) continue;

      const otherGroup = hashGroups[j];

      // Only compare image file groups (non-image files use exact hash matching)
      if (currentGroup.files[0].isImage && otherGroup.files[0].isImage) {
        // Compare the primary hashes
        const similarity = calculateHashSimilarity(
          currentGroup.primaryHash,
          otherGroup.primaryHash
        );

        // If similarity is above threshold, merge the groups
        if (similarity >= similarityThreshold) {
          mergedGroup.files.push(...otherGroup.files);
          processedGroups.add(j);
        }
      }
    }

    // Only add groups with multiple files
    if (mergedGroup.files.length > 1) {
      mergedGroups.push(mergedGroup);
    }
  }

  // Convert back to record format
  const result: Record<string, FileType[]> = {};
  mergedGroups.forEach((group, index) => {
    // Use primary hash or generate a new one for merged groups
    const groupHash = `${group.primaryHash}_group${index}`;
    result[groupHash] = group.files;
  });

  return result;
};

interface SearchApiProps extends NextApiRequest {
  body: {
    folderPathsToInclude: string[];
    folderPathsToExclude: string[];
  };
}

export default async function handler(
  req: SearchApiProps,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const abortController = new AbortController();
  const abortSignal = abortController.signal;

  res.on("close", () => {
    if (!res.writableEnded) {
      console.log("Search - Client disconnected, aborting operation...");
      abortController.abort();
    }
  });

  try {
    const { folderPathsToInclude, folderPathsToExclude } = req.body;

    const noPathFound = !folderPathsToInclude?.some(
      (folderPath) => folderPath !== ""
    );

    if (noPathFound) {
      return res.status(400).json({ error: "Missing folder(s) path(s)." });
    }

    const notValidFolders = folderPathsToInclude.filter(
      (folderPath) => !fs.existsSync(folderPath)
    );

    if (notValidFolders.length > 0) {
      const listFoldersMissing = notValidFolders
        .map((folderPath) => folderPath)
        .join(", ");
      return res.status(400).json({
        error: `The following folders weren't found: ${listFoldersMissing}`,
      });
    }

    try {
      // Find all files and group them by hash
      const filesGroups: Record<string, FileType[]> = {};

      for (const folderPath of folderPathsToInclude) {
        await getAllFiles(
          folderPath,
          folderPathsToExclude,
          filesGroups,
          abortSignal
        );
      }

      // Group similar images with similarity threshold
      const groupedResults = groupSimilarImages(
        filesGroups,
        SIMILARITY_THRESHOLD
      );

      res.status(200).json({ doubles: groupedResults });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error processing files." });
    }
  } catch (error) {
    if (abortSignal.aborted) {
      console.error("Aborted due to client cancel.");
      res.status(500).json({ error: "Aborted due to client cancel." });
    }
    console.error(error);
    res.status(500).json({ error: "An error occured." });
  }
}
