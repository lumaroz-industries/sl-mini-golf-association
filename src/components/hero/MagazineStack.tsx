import type { Article } from "@/content/repository";
import { ArticleCover } from "@/components/articles/ArticleCover";
import s from "./Hero.module.css";

/** Articles hero visual: a fanned stack of magazine covers, the featured story in front. */
export function MagazineStack({ lead }: { lead?: Article }) {
  return (
    <div className={s.stack} aria-hidden="true">
      <span className={s.stackGlow} />
      <span className={`${s.sheet} ${s.sheetBack}`}>
        <span className={s.lines} />
      </span>
      <span className={`${s.sheet} ${s.sheetMid}`}>
        <span className={s.lines} />
      </span>
      <span className={`${s.sheet} ${s.sheetFront}`}>
        <span className={s.sheetCover}>{lead ? <ArticleCover article={lead} sizes="320px" priority /> : null}</span>
        <span className={s.sheetText}>
          <span className={s.sheetKicker}>{lead ? lead.category.label : "Stories"}</span>
          <span className={s.sheetTitle}>{lead ? lead.title : "Stories from the green"}</span>
        </span>
        <span className={s.ribbon} />
        <span className={s.sheen} />
      </span>
    </div>
  );
}
