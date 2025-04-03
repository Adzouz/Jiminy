// Components
import LoadingAnimation from "./LoadingAnimation";

// Styles
import styles from "@/styles/components/Loading.module.scss";

interface LoadingScreenProps {
  onCancelRequest?: () => void;
}

const LoadingScreen = ({ onCancelRequest }: LoadingScreenProps) => (
  <div className={styles.loading}>
    <div className={styles.loadingTitle}>Loading... Please wait.</div>
    <LoadingAnimation />
    <p className={styles.loadingDescription}>
      Be patient. The process can take some time (depending on the number of
      items and their size).
      <br />
      <i>
        Note: if you have HEIC files, it could take more time and a{" "}
        <strong>.cache</strong> folder will be created in the folder analyzed to
        store converted images (so that the process will be faster next time)
      </i>
    </p>
    {onCancelRequest ? (
      <button
        onClick={() => onCancelRequest()}
        className={styles.cancelRequestButton}
      >
        Cancel
      </button>
    ) : null}
  </div>
);

export default LoadingScreen;
