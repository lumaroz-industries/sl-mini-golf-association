import Image from "next/image";
import { getPeopleByIds, getPeopleInstagram, getSiteSettings } from "@/content/repository";
import { InstagramHandle } from "@/components/ui/InstagramHandle";
import styles from "./WebsiteBy.module.css";

/** Compact "Website by" credit for the site's designer (end of articles). */
export async function WebsiteBy() {
  const site = await getSiteSettings();
  const [dev] = await getPeopleByIds([site.credits.developerId]);
  const insta = (await getPeopleInstagram())[dev.id];
  return (
    <aside className={styles.card} aria-label="Website credit">
      {dev.portrait && (
        <span className={styles.photo}>
          <Image src={dev.portrait.src} alt="" width={120} height={120} sizes="56px" />
        </span>
      )}
      <span className={styles.text}>
        <span className={styles.kicker}>Website by</span>
        <span className={styles.name}>{dev.name}</span>
        <span className={styles.role}>{dev.role}</span>
      </span>
      {insta && <InstagramHandle {...insta} name={dev.name} size="sm" />}
    </aside>
  );
}
