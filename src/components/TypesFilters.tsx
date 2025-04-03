// Libraries
import { useCallback } from "react";
import clsx from "clsx";

// Styles
import styles from "@/styles/components/TypesFilters.module.scss";

interface TypesFiltersProps {
  fileTypes: string[];
  selectedFileTypes: string[];
  setSelectedFileTypes: (selectedFileTypes: string[]) => void;
}

const TypesFilters = ({
  fileTypes,
  selectedFileTypes,
  setSelectedFileTypes,
}: TypesFiltersProps) => {
  const handleChangeFilters = useCallback(
    (extension: string) => {
      const newSelectedFileTypes = [...selectedFileTypes];
      if (selectedFileTypes.includes(extension)) {
        setSelectedFileTypes(
          newSelectedFileTypes.filter((fileType) => fileType !== extension)
        );
      } else {
        newSelectedFileTypes.push(extension);
        setSelectedFileTypes(newSelectedFileTypes);
      }
    },
    [selectedFileTypes, setSelectedFileTypes]
  );

  return (
    fileTypes.length > 0 && (
      <>
        <div className={styles.filtersTitle}>Show:</div>
        <div className={styles.filtersList}>
          {fileTypes.map((extension) => (
            <label
              key={`file_extension_filter_${extension}`}
              className={clsx(
                selectedFileTypes.includes(extension) && styles.active
              )}
            >
              {extension}
              <input
                type="checkbox"
                checked={selectedFileTypes.includes(extension)}
                onChange={() => handleChangeFilters(extension)}
              />
            </label>
          ))}
        </div>
      </>
    )
  );
};

export default TypesFilters;
