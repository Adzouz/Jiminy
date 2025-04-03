// Types
import type { NextApiRequest, NextApiResponse } from "next";
import type { Sharp } from "sharp";

// Libraries
import fs from "fs";
import path from "path";
import sharp from "sharp";
import convert from "heic-convert";

// Constants
import { CACHE_DIR } from "@/constants";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const abortController = new AbortController();
  const abortSignal = abortController.signal;

  try {
    const { fullPath } = req.query;

    if (!fullPath || typeof fullPath !== "string") {
      res.status(400).json({ error: "Missing fullPath parameter" });
    }

    const fullPathString = fullPath as string;

    if (!fs.existsSync(fullPathString)) {
      return res.status(404).json({ error: "Image not found" });
    }

    const imagePath = path.resolve(fullPathString);
    const inputBuffer = fs.readFileSync(imagePath);

    const metadata = await sharp(imagePath).metadata();
    const isHeicFile =
      metadata.format && ["heic", "heif"].includes(metadata.format);

    let transform: Sharp | fs.ReadStream;

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "no-store");

    if (isHeicFile) {
      const pathCache = path.join(path.dirname(imagePath), CACHE_DIR);
      const fileNameInCache = `${path.parse(imagePath).name}.jpg`;
      const cacheImagePath = path.join(pathCache, fileNameInCache);
      const fileInCache = fs.existsSync(cacheImagePath);

      if (fileInCache) {
        transform = fs.createReadStream(cacheImagePath);
      } else {
        try {
          const jpegBuffer = (await convert({
            buffer: inputBuffer as unknown as ArrayBufferLike,
            format: "JPEG",
            quality: 80,
          })) as unknown as Buffer<ArrayBufferLike>;

          transform = sharp(jpegBuffer)
            .rotate()
            .resize(200)
            .withMetadata({ orientation: 1 });
        } catch (err) {
          console.error("HEIC conversion failed:", err);
          return res.status(500).json({ error: "Failed to convert HEIC" });
        }
      }
    } else {
      transform = sharp(inputBuffer)
        .rotate()
        .resize(200)
        .withMetadata({ orientation: 1 })
        .jpeg({ quality: 80 });
    }

    if (abortSignal.aborted) {
      return;
    }

    res.on("close", () => {
      if (!res.writableEnded) {
        console.log("Image - Client disconnected, aborting operation...");
        transform.destroy();
      }
    });

    transform.pipe(res);
  } catch (error) {
    if (abortSignal.aborted) {
      console.error("Aborted due to client cancel");
      res.status(500).json({ error: "Aborted due to client cancel" });
    }
    console.error(error);
    res.status(500).json({ error: "An error occured." });
  }
}
