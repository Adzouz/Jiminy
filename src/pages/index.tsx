// Types
import type { DoubleType } from "@/types";

// Libraries
import { useState } from "react";

// Contexts
import { useAbortController } from "@/contexts/AbortControllerContext";

// Components
import ElementsList from "@/components/Elements/List";
import Form from "@/components/Form";
import Loading from "@/components/Loading/LoadingScreen";

// Styles
import styles from "@/styles/App.module.scss";

export default function Home() {
  const { abortRequests, getSignal } = useAbortController();
  const [folderPathsToInclude, setFolderPathsToInclude] = useState([""]);
  const [folderPathsToExclude, setFolderPathsToExclude] = useState([""]);
  const [doubles, setDoubles] = useState<DoubleType>({});
  const [loading, setLoading] = useState(false);
  const [requestPerformed, setRequestPerformed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    abortRequests();

    setLoading(true);
    setDoubles({});
    setRequestPerformed(false);
    setError(null);

    await fetch("/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ folderPathsToInclude, folderPathsToExclude }),
      signal: getSignal(),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setDoubles(data.doubles);
        }
      })
      .catch((error) => {
        const errorMessage =
          error instanceof DOMException && error.name === "AbortError"
            ? "Request was aborted."
            : error instanceof Error
              ? error.message
              : "An unknown error occurred.";
        console.error(errorMessage);
        setError(errorMessage);
      })
      .finally(() => {
        setRequestPerformed(true);
        setLoading(false);
      });
  };

  return (
    <>
      <Form
        handleSubmit={handleSubmit}
        folderPathsToInclude={folderPathsToInclude}
        folderPathsToExclude={folderPathsToExclude}
        setFolderPathsToInclude={setFolderPathsToInclude}
        setFolderPathsToExclude={setFolderPathsToExclude}
      />

      {error && <p className={styles.errorMessage}>{error}</p>}

      {loading ? (
        <Loading
          onCancelRequest={() => {
            abortRequests();
          }}
        />
      ) : requestPerformed && !error ? (
        <ElementsList doubles={doubles} setDoubles={setDoubles} />
      ) : null}
    </>
  );
}
