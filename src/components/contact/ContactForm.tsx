"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  ContactFields,
  LIMITS,
  fieldErrors,
  type ContactField,
  type ContactResponse,
  type FieldErrors,
} from "@/lib/contact/schema";
import styles from "./ContactForm.module.css";

interface ContactFormProps {
  heading: string;
  /** False until email delivery is configured — the form is shown but closed. */
  enabled: boolean;
  unavailableMessage: string;
  successHeading: string;
  successBody: string;
  /** Official email, offered as a fallback if sending fails. */
  email?: string;
}

type Status = "idle" | "sending" | "success" | "error" | "handed";

const EMPTY = { name: "", email: "", subject: "", message: "" };
const ORDER: ContactField[] = ["name", "email", "subject", "message"];

export function ContactForm({ heading, enabled, unavailableMessage, successHeading, successBody, email }: ContactFormProps) {
  const id = useId();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<ContactField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [serverMessage, setServerMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const startedAt = useRef(0);
  const fieldRefs = useRef<Partial<Record<ContactField, HTMLInputElement | HTMLTextAreaElement | null>>>({});
  const successRef = useRef<HTMLHeadingElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (status === "success") successRef.current?.focus();
    if (status === "error") alertRef.current?.focus();
  }, [status]);

  const validate = (next: typeof values): FieldErrors => {
    const result = ContactFields.safeParse(next);
    return result.success ? {} : fieldErrors(result.error);
  };

  const update = (field: ContactField, value: string) => {
    const next = { ...values, [field]: value };
    setValues(next);
    if (submitted || touched[field]) setErrors(validate(next));
  };

  const blur = (field: ContactField) => {
    setTouched((t) => ({ ...t, [field]: true }));
    if (values[field].trim() !== "") setErrors(validate(values));
  };

  // Without email delivery set up, the form still works: it opens the message in Gmail, ready to send.
  const viaGmail = !enabled && !!email;
  const compose = () => {
    const body = `${values.message.trim()}\n\n— ${values.name.trim()} (${values.email.trim()})`;
    const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email!)}&su=${encodeURIComponent(values.subject.trim())}&body=${encodeURIComponent(body)}`;
    const mailto = `mailto:${email}?subject=${encodeURIComponent(values.subject.trim())}&body=${encodeURIComponent(body)}`;
    return { gmail, mailto };
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (viaGmail) {
      setSubmitted(true);
      const found = validate(values);
      setErrors(found);
      const first = ORDER.find((f) => found[f]);
      if (first) return void fieldRefs.current[first]?.focus();
      window.open(compose().gmail, "_blank", "noopener,noreferrer");
      setStatus("handed");
      return;
    }
    if (!enabled || status === "sending") return;
    setSubmitted(true);
    const found = validate(values);
    setErrors(found);
    const first = ORDER.find((f) => found[f]);
    if (first) {
      fieldRefs.current[first]?.focus();
      return;
    }

    setStatus("sending");
    setServerMessage("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, website: honeypot, startedAt: startedAt.current }),
      });
      const data = (await res.json().catch(() => null)) as ContactResponse | null;
      if (data?.ok) {
        setStatus("success");
        return;
      }
      if (data && data.error === "validation") {
        setErrors(data.fields);
        setStatus("idle");
        const firstServer = ORDER.find((f) => data.fields[f]);
        if (firstServer) fieldRefs.current[firstServer]?.focus();
        return;
      }
      setServerMessage(data && "message" in data ? data.message : "Something went wrong while sending. Please try again.");
      setStatus("error");
    } catch {
      setServerMessage("We could not reach the server. Check your connection and try again.");
      setStatus("error");
    }
  };

  const reset = () => {
    setValues(EMPTY);
    setErrors({});
    setTouched({});
    setSubmitted(false);
    setStatus("idle");
    startedAt.current = Date.now();
  };

  if (status === "handed") {
    const { gmail, mailto } = compose();
    return (
      <div className={styles.card}>
        <div className={styles.success} role="status">
          <div className={styles.putt} aria-hidden="true">
            <span className={styles.cup} />
            <span className={styles.ball} />
          </div>
          <h2 ref={successRef} tabIndex={-1} className={styles.heading}>
            Almost there
          </h2>
          <p className={styles.successBody}>Your message is open in Gmail with everything filled in — just press Send there. Didn&apos;t open?</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <a className={styles.submit} href={gmail} target="_blank" rel="noopener noreferrer">
              Open in Gmail <span aria-hidden="true">↗</span>
            </a>
            <a className={styles.secondary} href={mailto}>
              Use another mail app
            </a>
          </div>
          <button type="button" className={styles.secondary} onClick={reset}>
            Write another message
          </button>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className={styles.card}>
        <div className={styles.success} role="status">
          <div className={styles.putt} aria-hidden="true">
            <span className={styles.cup} />
            <span className={styles.ball} />
          </div>
          <h2 ref={successRef} tabIndex={-1} className={styles.heading}>
            {successHeading}
          </h2>
          <p className={styles.successBody}>{successBody}</p>
          <button type="button" className={styles.secondary} onClick={reset}>
            Send another message
          </button>
        </div>
      </div>
    );
  }

  const sending = status === "sending";
  const errorCount = ORDER.filter((f) => errors[f]).length;

  const fieldProps = (field: ContactField) => ({
    id: `${id}-${field}`,
    name: field,
    value: values[field],
    required: true,
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": [errors[field] ? `${id}-${field}-error` : "", field === "message" ? `${id}-message-count` : ""].filter(Boolean).join(" ") || undefined,
    onBlur: () => blur(field),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => update(field, e.target.value),
    ref: (el: HTMLInputElement | HTMLTextAreaElement | null) => {
      fieldRefs.current[field] = el;
    },
  });

  const label = (field: ContactField, text: string) => (
    <label htmlFor={`${id}-${field}`} className={styles.label}>
      {text}
      <span className={styles.required} aria-hidden="true">
        *
      </span>
    </label>
  );

  const error = (field: ContactField) =>
    errors[field] ? (
      <p id={`${id}-${field}-error`} className={styles.error}>
        {errors[field]}
      </p>
    ) : null;

  return (
    <div className={styles.card} data-disabled={(!enabled && !viaGmail) || undefined}>
      <h2 className={styles.heading}>{heading}</h2>

      {viaGmail ? (
        <p className={styles.note} role="note">
          <span aria-hidden="true">✉</span> Fill this in and it opens in Gmail, ready to send from your own account.
        </p>
      ) : (
        !enabled && (
          <p className={styles.notice} role="note">
            <span className={styles.noticeDot} aria-hidden="true" />
            {unavailableMessage}
          </p>
        )
      )}

      {submitted && errorCount > 0 && (
        <p className={styles.summary} role="alert">
          Please check {errorCount === 1 ? "the highlighted field" : `the ${errorCount} highlighted fields`}.
        </p>
      )}

      {status === "error" && (
        <div ref={alertRef} tabIndex={-1} className={styles.serverError} role="alert">
          <p>{serverMessage}</p>
          {email && (
            <p>
              You can also email us at <a href={`mailto:${email}`}>{email}</a>.
            </p>
          )}
        </div>
      )}

      <form className={styles.form} onSubmit={onSubmit} noValidate aria-busy={sending}>
        <fieldset className={styles.fieldset} disabled={(!enabled && !viaGmail) || sending}>
          <legend className="visually-hidden">{heading}</legend>
          <div className={styles.row}>
            <div className={styles.field}>
              {label("name", "Full name")}
              <input {...fieldProps("name")} type="text" autoComplete="name" maxLength={LIMITS.name.max} className={styles.input} />
              {error("name")}
            </div>
            <div className={styles.field}>
              {label("email", "Email address")}
              <input {...fieldProps("email")} type="email" autoComplete="email" inputMode="email" maxLength={LIMITS.email.max} className={styles.input} />
              {error("email")}
            </div>
          </div>

          <div className={styles.field}>
            {label("subject", "Subject")}
            <input {...fieldProps("subject")} type="text" maxLength={LIMITS.subject.max} className={styles.input} />
            {error("subject")}
          </div>

          <div className={styles.field}>
            {label("message", "Message")}
            <textarea {...fieldProps("message")} rows={7} maxLength={LIMITS.message.max} className={`${styles.input} ${styles.textarea}`} />
            <div className={styles.meta}>
              {error("message") ?? <span />}
              <span id={`${id}-message-count`} className={styles.count}>
                {values.message.length} / {LIMITS.message.max}
              </span>
            </div>
          </div>

          {/* Honeypot: invisible to people, tempting to bots. */}
          <div className={styles.trap} aria-hidden="true">
            <label htmlFor={`${id}-website`}>Leave this field empty</label>
            <input id={`${id}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
          </div>

          <div className={styles.actions}>
            <p className={styles.hint}>
              <span aria-hidden="true">*</span> All fields are required.
            </p>
            <button type="submit" className={styles.submit} disabled={(!enabled && !viaGmail) || sending}>
              {sending ? (
                <>
                  <span className={styles.spinner} aria-hidden="true" /> Sending…
                </>
              ) : viaGmail ? (
                <>
                  Continue in Gmail <span aria-hidden="true">↗</span>
                </>
              ) : (
                <>
                  Send message <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
