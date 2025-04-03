// Types
import type { DoubleType, FileType, SelectedItems } from "@/types";

// Libraries
import React, { useEffect, useMemo, useState } from "react";
import clsx from "clsx";

// Contexts
import { useAbortController } from "@/contexts/AbortControllerContext";

// Components
import ElementItem from "@/components/Elements/Item";
import Loading from "@/components/Loading/LoadingScreen";
import TypesFilters from "@/components/TypesFilters";

// Styles
import styles from "@/styles/components/ElementsList.module.scss";

// Constants
import { NB_ITEMS_PER_PAGE } from "@/constants";

interface ElementsListProps {
  doubles: DoubleType;
  setDoubles: (doubles: DoubleType) => void;
}

const ElementsList = ({ doubles, setDoubles }: ElementsListProps) => {
  const { abortRequests, getSignal } = useAbortController();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<SelectedItems>({});
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>([]);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const fileTypes: string[] = [];
    Object.keys(doubles).forEach((hash) => {
      for (const file of doubles[hash]) {
        if (!fileTypes.includes(file.extension)) {
          fileTypes.push(file.extension);
        }
      }
    });
    setSelectedFileTypes(fileTypes);
  }, [doubles]);

  useEffect(() => {
    setPage(0);
  }, [selectedFileTypes]);

  const nbDoubles = useMemo(() => Object.keys(doubles).length, [doubles]);
  const fileTypes = useMemo(() => {
    const returnValue: string[] = [];
    Object.keys(doubles).forEach((hash) => {
      for (const file of doubles[hash]) {
        if (!returnValue.includes(file.extension)) {
          returnValue.push(file.extension);
        }
      }
    });
    return returnValue;
  }, [doubles]);
  const filteredDoubles = useMemo(
    () =>
      Object.entries(doubles)
        .map(([hash, files]) => {
          const filesAllowed = files.some((file) =>
            selectedFileTypes.includes(file.extension)
          );
          return filesAllowed ? { hash, files } : null;
        })
        .filter(Boolean) as { hash: string; files: FileType[] }[],
    [doubles, selectedFileTypes]
  );
  const memoizedSelectedItems = useMemo(() => selectedItems, [selectedItems]);
  const nbItemsToDelete = useMemo(() => {
    let total = 0;
    Object.values(memoizedSelectedItems).forEach((paths) => {
      total += paths.length;
    });
    return total;
  }, [memoizedSelectedItems]);

  const handleDeleteFiles = async (e: React.FormEvent) => {
    e.preventDefault();

    abortRequests();

    setLoading(true);
    setError(null);

    await fetch("/api/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filesToDelete: selectedItems }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          // We update the doubles by removing the deleted items
          const copyDoubles: DoubleType = { ...doubles };
          Object.keys(doubles).map((hash) => {
            const filePathFound = selectedItems[hash];
            if (filePathFound?.length) {
              filePathFound.forEach((fullPath) => {
                copyDoubles[hash] = copyDoubles[hash].filter(
                  (item) => item.fullPath !== fullPath
                );
              });
              if (copyDoubles[hash].length <= 1) {
                delete copyDoubles[hash];
              }
            }
          });
          setDoubles(copyDoubles);
          setSelectedItems({});
        }
      })
      .catch((error) => {
        console.error(error);
        setError(error);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const displayedFilteredItems = useMemo(() => {
    const startItem = page * NB_ITEMS_PER_PAGE;
    return filteredDoubles.slice(startItem, startItem + NB_ITEMS_PER_PAGE);
  }, [filteredDoubles, page]);

  const nbPages = useMemo(() => {
    return Math.ceil(filteredDoubles.length / NB_ITEMS_PER_PAGE);
  }, [filteredDoubles]);

  return (
    <>
      {loading && <Loading />}
      <h2 className={styles.sectionTitle}>
        Found <span>{nbDoubles}</span> similar element{nbDoubles > 1 && "s"}
        {nbDoubles === 0 && " 🥳"}
      </h2>
      {nbDoubles > 0 && (
        <>
          <p className={styles.infoDeletion}>
            You can select the elements you want to delete.
            <br />
            Be careful: if you select an item on a line and you hide it with
            type filtering, it will still be deleted.
          </p>
          <TypesFilters
            fileTypes={fileTypes}
            selectedFileTypes={selectedFileTypes}
            setSelectedFileTypes={setSelectedFileTypes}
          />
          <p className={styles.nbItemsDisplayed}>
            <span>{filteredDoubles.length}</span> item
            {filteredDoubles.length > 1 && "s"} displayed
          </p>
          <div className={styles.itemsList}>
            {displayedFilteredItems.map(({ hash, files }) => (
              <div key={`item_${hash}`}>
                <ul
                  className={clsx(
                    styles.filesRow,
                    selectedItems[hash] && styles.activeRow
                  )}
                >
                  {files.map((file) => (
                    <ElementItem
                      key={`file_${file.fullPath}`}
                      item={file}
                      hash={hash}
                      selectedItems={memoizedSelectedItems}
                      setSelectedItems={setSelectedItems}
                      signal={getSignal()}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {nbPages > 1 && (
            <div className={styles.navigation}>
              <p>
                Page <span>{page + 1}</span> of <span>{nbPages}</span>
              </p>
              <div className={styles.actions}>
                <button
                  onClick={() => setPage(page - 1)}
                  className={clsx(page <= 0 && styles.hide)}
                  disabled={page <= 0}
                >
                  Prev page
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  className={clsx(page >= nbPages - 1 && styles.hide)}
                  disabled={page >= nbPages - 1}
                >
                  Next page
                </button>
              </div>
            </div>
          )}
          {error && <p className={styles.errorMessage}>{error}</p>}
          {Object.keys(selectedItems).length > 0 && (
            <form
              className={styles.form}
              onSubmit={(e) => handleDeleteFiles(e)}
            >
              <p className={styles.message}>
                You&apos;ll delete <span>{nbItemsToDelete}</span> file
                {nbItemsToDelete > 1 && "s"}
              </p>
              <button className={styles.button} disabled={loading}>
                Process deletion
              </button>
            </form>
          )}
        </>
      )}
    </>
  );
};

export default ElementsList;
