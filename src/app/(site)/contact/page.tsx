import type { Metadata } from "next";
import { findNavItem } from "@/config/navigation";
import { getActiveSocialLinks, getContactContent, getSiteSettings } from "@/content/repository";
import { isContactDeliveryConfigured } from "@/lib/contact/delivery";
import { ContactForm } from "@/components/contact/ContactForm";
import { SocialLinks } from "@/components/ui/SocialLinks";
import styles from "./page.module.css";

const item = findNavItem("/contact");

export const metadata: Metadata = {
  title: item.label,
  description: item.summary,
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const [content, site, social] = await Promise.all([getContactContent(), getSiteSettings(), getActiveSocialLinks()]);
  const email = site.contact.email;

  return (
    <section className={styles.page} aria-labelledby="contact-title">
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.grid} aria-hidden="true" />

      <div className={`container ${styles.layout}`}>
        <div className={styles.info}>
          <span className="kicker">{content.kicker}</span>
          <h1 id="contact-title" className={styles.title}>
            {content.heading}
          </h1>
          <p className={styles.intro}>{content.intro}</p>

          <div className={styles.channel}>
            <span className={styles.channelLabel}>Official email</span>
            {email ? (
              <a className={styles.email} href={`mailto:${email}`}>
                {email}
                <span aria-hidden="true">↗</span>
              </a>
            ) : (
              <p className={styles.pending}>{content.emailPending}</p>
            )}
          </div>

          {social.length > 0 && (
            <div className={styles.channel}>
              <span className={styles.channelLabel}>Follow</span>
              <SocialLinks links={social} />
            </div>
          )}

          <p className={styles.independent}>{site.name} is an independent mini-golf community platform.</p>
        </div>

        <ContactForm
          heading={content.formHeading}
          enabled={await isContactDeliveryConfigured()}
          unavailableMessage={content.formUnavailable}
          successHeading={content.successHeading}
          successBody={content.successBody}
          email={email}
        />
      </div>
    </section>
  );
}
