"use client";

import { useEffect, useState } from "react";
import { todayInIndia } from "@/lib/events";
import styles from "./Updates.module.css";

const NEW_FOR_DAYS = 7;

/** "New" for updates posted in the last week — decided in the browser so it never goes stale. */
export function NewBadge({ publishedAt }: { publishedAt: string }) {
  const [fresh, setFresh] = useState(false);
  useEffect(() => {
    const age = (Date.parse(todayInIndia()) - Date.parse(publishedAt)) / 86_400_000;
    setFresh(age >= 0 && age < NEW_FOR_DAYS);
  }, [publishedAt]);
  return fresh ? <span className={styles.new}>New</span> : null;
}
