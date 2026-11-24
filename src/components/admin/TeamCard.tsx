import Image from "next/image";
import { dmLink, type TeamMember } from "@/lib/admin/team";
import sc from "@/components/social/Social.module.css";
import c from "./credits.module.css";

/**
 * Dashboard card for the designer (diamond — the richest) or the founder
 * (gold — a step quieter), in the same style as their Social Media cards.
 */
export function TeamCard({ person, finish, kicker, text }: { person: TeamMember; finish: "diamond" | "gold"; kicker: string; text: string }) {
  const insta = person.instagram;
  return (
    <div className={sc.profile} data-wide data-full data-photo={person.photo ? true : undefined} data-spotlight={finish}>
      <span className={sc.texture} data-kind={finish} aria-hidden="true" />
      {finish === "diamond" && <span className={sc.sparkles} aria-hidden="true" />}
      {finish === "diamond" && <span className={sc.sheen} aria-hidden="true" />}
      {person.photo && (
        <span className={sc.fullPhoto} aria-hidden="true">
          <Image src={person.photo.src} alt="" width={person.photo.width} height={person.photo.height} sizes="(max-width: 760px) 100vw, 40vw" />
        </span>
      )}
      <span className={sc.profileTop}>
        <span className={sc.tags}>
          <span className={sc.chip}>{kicker}</span>
        </span>
      </span>
      <span className={sc.profileBody}>
        <span className={sc.profileName}>{person.name}</span>
        <span className={sc.profileHandle}>{person.role}</span>
        <span className={sc.profileDetail}>{text}</span>
      </span>
      <span className={c.actions} style={{ gridArea: "cta", position: "relative", zIndex: 1 }}>
        {insta && finish === "diamond" && (
          <>
            <a className={c.actionBtn} data-primary="diamond" href={dmLink(insta.url)} target="_blank" rel="noopener noreferrer">
              Report a problem ↗
            </a>
            <a className={c.actionBtn} href={dmLink(insta.url)} target="_blank" rel="noopener noreferrer">
              Request a feature ↗
            </a>
          </>
        )}
        {insta && (
          <a className={c.actionBtn} data-primary={finish === "gold" ? "gold" : undefined} href={insta.url} target="_blank" rel="noopener noreferrer">
            {insta.handle} on Instagram ↗
          </a>
        )}
      </span>
    </div>
  );
}
