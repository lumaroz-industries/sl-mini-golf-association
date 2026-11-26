import s from "./Hero.module.css";

/** A page title with its last word outlined (as on the homepage, Contact and Social Media). */
export function OutlinedTitle({ text, className }: { text: string; className?: string }) {
  const words = text.trim().split(/\s+/);
  const last = words.pop();
  return (
    <h1 className={className}>
      {words.join(" ")} <span className={s.outline}>{last}</span>
    </h1>
  );
}
