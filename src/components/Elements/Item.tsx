// Types
import type { FileType, SelectedItems } from "@/types";

// Libraries
import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";

// Components
import LoadingAnimation from "@/components/Loading/LoadingAnimation";

// Styles
import styles from "@/styles/components/ElementItem.module.scss";

// Constants
import { FILE_SIZES } from "@/constants";

function formatBytes(bytes: number, decimals = 2): string {
  if (!+bytes) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${FILE_SIZES[i]}`;
}

interface ElementItemProps {
  item: FileType;
  hash: string;
  selectedItems: SelectedItems;
  setSelectedItems: (selectedItems: SelectedItems) => void;
  signal?: AbortSignal;
}

const ElementItem = React.memo(
  ({
    item,
    hash,
    selectedItems,
    setSelectedItems,
    signal,
  }: ElementItemProps) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const { fullPath, isImage, name, size, imageType } = item;

    useEffect(() => {
      const loadImage = async () => {
        try {
          const response = await fetch(
            `/api/image?fullPath=${encodeURIComponent(fullPath)}`,
            { signal }
          );
          if (!response.ok) throw new Error("Failed to load image");
          const blob = await response.blob();
          setImageUrl(URL.createObjectURL(blob));
        } catch (error) {
          const errorMessage =
            error instanceof DOMException && error.name === "AbortError"
              ? "Request was aborted"
              : error instanceof Error
                ? error.message
                : "An unknown error occurred";
          console.error(errorMessage);
        }
      };

      if (isImage) {
        loadImage();
      }
    }, [fullPath, isImage, signal]);

    const handleSelectItem = useCallback(
      (hash: string, fileFullPath: string) => {
        const newSelectedItems = { ...selectedItems };
        const selectedHash = selectedItems[hash];

        if (selectedHash) {
          if (!selectedHash.includes(fileFullPath)) {
            newSelectedItems[hash].push(fileFullPath);
          } else {
            const newValue = newSelectedItems[hash].filter(
              (path) => path !== fileFullPath
            );
            if (newValue.length) {
              newSelectedItems[hash] = newSelectedItems[hash].filter(
                (path) => path !== fileFullPath
              );
            } else {
              delete newSelectedItems[hash];
            }
          }
        } else {
          newSelectedItems[hash] = [fileFullPath];
        }

        setSelectedItems(newSelectedItems);
      },
      [selectedItems, setSelectedItems]
    );

    return (
      <li className={styles.file}>
        <label
          className={
            selectedItems[hash]?.includes(fullPath) ? styles.selected : ""
          }
        >
          {item.isImage && (
            <span className={styles.image}>
              {imageUrl && (
                <Image
                  src={imageUrl}
                  alt=""
                  width={100}
                  height={100}
                  quality={80}
                />
              )}
              <span className={styles.imageLoader}>
                <LoadingAnimation
                  color={
                    selectedItems[hash]?.includes(fullPath)
                      ? "white"
                      : undefined
                  }
                />
              </span>
              {imageType && (
                <span className={styles.imageType}>{imageType}</span>
              )}
            </span>
          )}
          <span className={styles.info}>
            <span className={styles.fileName}>{name}</span>
            <span className={styles.filePath}>{fullPath}</span>
            <span className={styles.fileSize}>Size: {formatBytes(size)}</span>
          </span>
          <span className={styles.checkbox}>
            <input
              type="checkbox"
              onClick={() => handleSelectItem(hash, fullPath)}
              onChange={() => {}}
              checked={!!selectedItems[hash]?.includes(fullPath)}
              name={`file_${hash}`}
            />
          </span>
        </label>
      </li>
    );
  }
);

ElementItem.displayName = "ElementItem";

export default ElementItem;
