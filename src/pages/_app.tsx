// Libraries
import React from "react";
import type { AppProps } from "next/app";
import Head from "next/head";

// Contexts
import { AbortControllerProvider } from "@/contexts/AbortControllerContext";

// Styles
import { Montserrat } from "next/font/google";
import "@/styles/globals.scss";
import styles from "@/styles/App.module.scss";

// Init font
const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AbortControllerProvider>
      <Head>
        <title>Jiminy</title>
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>👯‍♀️</text></svg>"
        />
      </Head>
      <div className={montserrat.className}>
        <h1>Jiminy</h1>
        <p className={styles.baseline}>
          Duplicates + similar files finder 👯‍♀️ and remover 🗑️
        </p>
        <Component {...pageProps} />
      </div>
    </AbortControllerProvider>
  );
}
