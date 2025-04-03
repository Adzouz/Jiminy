// Styles
import styles from "@/styles/components/Form.module.scss";

interface FormProps {
  handleSubmit: (e: React.FormEvent) => void;
  folderPathsToInclude: string[];
  folderPathsToExclude: string[];
  setFolderPathsToInclude: (folderPaths: string[]) => void;
  setFolderPathsToExclude: (folderPaths: string[]) => void;
}

const Form = ({
  handleSubmit,
  folderPathsToInclude,
  folderPathsToExclude,
  setFolderPathsToInclude,
  setFolderPathsToExclude,
}: FormProps) => {
  const handleFolderPathChange = (
    type: "include" | "exclude",
    index: number,
    value: string
  ) => {
    const newFolderPaths =
      type === "include"
        ? [...folderPathsToInclude]
        : [...folderPathsToExclude];
    newFolderPaths[index] = value;
    if (type === "include") {
      setFolderPathsToInclude(newFolderPaths);
    } else {
      setFolderPathsToExclude(newFolderPaths);
    }
  };
  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.foldersInputsList}>
        <div className={styles.foldersInputsItem}>
          <div className={styles.fieldTitle}>Folders to include:</div>
          {folderPathsToInclude.map((value, index) => (
            <input
              type="text"
              value={value}
              onChange={(e) =>
                handleFolderPathChange("include", index, e.target.value)
              }
              placeholder="Enter absolute folder path"
              key={`folderPath_${index}`}
            />
          ))}
          <div className={styles.actions}>
            <button
              type="button"
              onClick={() =>
                setFolderPathsToInclude([
                  ...folderPathsToInclude.slice(
                    0,
                    folderPathsToInclude.length - 1
                  ),
                ])
              }
              disabled={folderPathsToInclude.length <= 1}
            >
              -
            </button>
            <button
              type="button"
              onClick={() =>
                setFolderPathsToInclude([...folderPathsToInclude, ""])
              }
            >
              +
            </button>
          </div>
        </div>
        <div className={styles.foldersInputsItem}>
          <div className={styles.fieldTitle}>
            Folders to exclude (optional):
          </div>
          {folderPathsToExclude.map((value, index) => (
            <input
              type="text"
              value={value}
              onChange={(e) =>
                handleFolderPathChange("exclude", index, e.target.value)
              }
              placeholder="Enter absolute folder path"
              key={`folderPath_${index}`}
            />
          ))}
          <div className={styles.actions}>
            <button
              type="button"
              onClick={() =>
                setFolderPathsToExclude([
                  ...folderPathsToExclude.slice(
                    0,
                    folderPathsToExclude.length - 1
                  ),
                ])
              }
              disabled={folderPathsToExclude.length <= 1}
            >
              -
            </button>
            <button
              type="button"
              onClick={() =>
                setFolderPathsToExclude([...folderPathsToExclude, ""])
              }
            >
              +
            </button>
          </div>
        </div>
      </div>

      <button type="submit">Search</button>
    </form>
  );
};

export default Form;
