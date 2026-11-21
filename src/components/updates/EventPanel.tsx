"use client";

import { useEffect, useRef, useState } from "react";
import type { UpdateEvent } from "@/content/schema";
import { eventStatus, formatEventWhen, formatEventWhere, googleCalendarUrl, outlookCalendarUrl, statusLabel, type EventStatus } from "@/lib/events";
import styles from "./Updates.module.css";

interface EventPanelProps {
  slug: string;
  title: string;
  details: string;
  event: UpdateEvent;
}

/**
 * Event details with a live status ("In 12 days", "Today", "Completed") that
 * is worked out in the visitor's browser in India time, so it never goes
 * stale between deploys.
 */
export function EventPanel({ slug, title, details, event }: EventPanelProps) {
  const [status, setStatus] = useState<EventStatus | null>(null);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStatus(eventStatus(event));
  }, [event]);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menu]);

  const done = status?.kind === "completed";
  const [y, m, d] = event.startDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));

  return (
    <div className={styles.event} data-status={status?.kind}>
      <div className={styles.eventDate} aria-hidden="true">
        <span>{date.toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" })}</span>
        <b>{d}</b>
      </div>
      <div className={styles.eventInfo}>
        {status && <span className={styles.eventStatus}>{statusLabel(status)}</span>}
        <p className={styles.eventWhen}>{formatEventWhen(event)}</p>
        <p className={styles.eventWhere}>{formatEventWhere(event)}</p>
      </div>
      {!done && (
        <div className={styles.eventActions}>
          {event.registrationUrl && (
            <a className={styles.primary} href={event.registrationUrl} target="_blank" rel="noopener noreferrer">
              Register <span aria-hidden="true">↗</span>
            </a>
          )}
          <div className={styles.calendar} ref={menuRef}>
            <button type="button" className={styles.secondary} aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
              Add to calendar
            </button>
            {menu && (
              <ul className={styles.calendarMenu}>
                <li>
                  <a href={googleCalendarUrl(title, event, details)} target="_blank" rel="noopener noreferrer">
                    Google Calendar
                  </a>
                </li>
                <li>
                  <a href={outlookCalendarUrl(title, event, details)} target="_blank" rel="noopener noreferrer">
                    Outlook.com
                  </a>
                </li>
                <li>
                  <a href={`/updates/${slug}/event.ics`} download={`${slug}.ics`}>
                    Apple Calendar &amp; others (.ics)
                  </a>
                </li>
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
