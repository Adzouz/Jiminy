// Types
import type { NextApiRequest, NextApiResponse } from "next";

// Libraries
import fs from "fs";
import path from "path";
import { getIsFileHeic, getIsImage } from "@/utils/image";

// Constants
import { CACHE_DIR } from "@/constants";

interface DeleteApiProps extends NextApiRequest {
  body: {
    filesToDelete: {
      [key: string]: string[];
    };
  };
}

export default async function handler(
  req: DeleteApiProps,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const { filesToDelete } = req.body;

  const filePathsToDelete: string[] = [];
  Object.values(filesToDelete).map((filePaths) => {
    filePaths.forEach((filePath) => {
      filePathsToDelete.push(filePath);
    });
  });

  if (filePathsToDelete.length === 0) {
    return res.status(400).json({ error: "There's nothing to delete." });
  }

  try {
    for (const fullPath of filePathsToDelete) {
      if (fs.existsSync(fullPath)) {
        try {
          const isFileImage = getIsImage(fullPath);
          if (isFileImage) {
            // Check if file is an image of type HEIC
            const isFileHeic = await getIsFileHeic(fullPath);
            if (isFileHeic) {
              const pathCache = path.join(path.dirname(fullPath), CACHE_DIR);
              const fileNameInCache = `${path.parse(fullPath).name}.jpg`;
              const cacheImagePath = path.join(pathCache, fileNameInCache);
              const fileInCache = fs.existsSync(cacheImagePath);

              // If there's a copy in cache, remove it
              if (fileInCache) {
                fs.unlinkSync(cacheImagePath);
                console.log(`Cache file ${cacheImagePath} deleted.`);

                // If the cache folder is empty, we can remove it
                const entries = fs.readdirSync(pathCache, {
                  withFileTypes: true,
                });
                if (entries.length === 0) {
                  fs.rmdirSync(pathCache);
                  console.log(`Cache folder ${pathCache} deleted.`);
                }
              }
            }
          }
        } catch (error) {
          console.error(error);
          console.log(`HEIC format check failed for ${fullPath}. Skipping.`);
        }

        // Remove the original file
        fs.unlinkSync(fullPath);
        console.log(`${fullPath} deleted.`);
      }
    }

    res.status(200).json({ message: "Files successfully deleted." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error trying to delete files." });
  }
}
