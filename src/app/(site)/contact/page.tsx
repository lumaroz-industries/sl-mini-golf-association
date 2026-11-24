import type { Metadata } from "next";
import Image from "next/image";
import { findNavItem } from "@/config/navigation";
import { getActiveSocialLinks, getContactContent, getPeopleByIds, getPeopleInstagram, getSiteSettings } from "@/content/repository";
import { InstagramHandle } from "@/components/ui/InstagramHandle";
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
  const [content, site, social, instagram] = await Promise.all([getContactContent(), getSiteSettings(), getActiveSocialLinks(), getPeopleInstagram()]);
  const email = site.contact.email;
  const [developer] = await getPeopleByIds([site.credits.developerId]);
  const devInsta = instagram[developer.id];
  // Opens a new message in Gmail (web or app); the plain mail-app link is offered next to it.
  const gmail = email ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}` : "";

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

          {/* The person who built the site — for website design and development enquiries. */}
          <div className={styles.dev}>
            <span className={styles.devGlow} aria-hidden="true" />
            {developer.portrait && (
              <span className={styles.devPhoto}>
                <Image src={developer.portrait.src} alt={developer.portrait.alt} width={160} height={160} sizes="88px" />
              </span>
            )}
            <span className={styles.devText}>
              <span className={styles.devKicker}>Website designed &amp; built by</span>
              <span className={styles.devName}>{developer.name}</span>
              <span className={styles.devRole}>{developer.role}</span>
              <span className={styles.devNote}>Want a website like this one? Message me on Instagram.</span>
              {devInsta && <InstagramHandle {...devInsta} name={developer.name} />}
            </span>
          </div>

          <div className={styles.channel}>
            <span className={styles.channelLabel}>Official email</span>
            {email ? (
              <>
                <a className={styles.email} href={gmail} target="_blank" rel="noopener noreferrer">
                  {email}
                  <span aria-hidden="true">↗</span>
                  <span className="visually-hidden"> — write in Gmail (opens in a new tab)</span>
                </a>
                <span className={styles.emailAlt}>
                  Opens Gmail · <a href={`mailto:${email}`}>use another mail app</a>
                </span>
              </>
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
