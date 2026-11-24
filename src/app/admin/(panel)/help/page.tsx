import { PageHead } from "@/components/admin/Page";
import { Section } from "@/components/admin/fields";
import { TeamCard } from "@/components/admin/TeamCard";
import { getTeam } from "@/lib/admin/team";
import c from "@/components/admin/credits.module.css";
import s from "@/components/admin/admin.module.css";

export const metadata = { title: "Help" };

export default async function HelpPage() {
  const { dev } = await getTeam();
  return (
    <>
      <PageHead kicker="Help & Support" title="How SL Admin works" lede="Everything you need to post, edit and look after the website." />
      <div className={s.form}>
        <Section title="Posting something new">
          <ol className={c.steps}>
            <li>
              Open <b>Updates</b>, <b>Articles</b> or <b>Gallery</b> from the menu and press <b>+ New</b>.
            </li>
            <li>
              Fill in the boxes from top to bottom. The <b>web address</b> fills itself in from the title and can’t change after publishing.
            </li>
            <li>
              Add photos with the photo buttons. Write a short <b>description</b> for every photo — it’s required.
            </li>
            <li>
              Press <b>Save draft</b> to keep working privately, or <b>Publish</b> to put it live. The website updates in about 1–2 minutes and the admin tells you when it’s live.
            </li>
          </ol>
        </Section>
        <Section title="Editing and deleting">
          <ol className={c.steps}>
            <li>
              Press <b>Edit</b> on any item, change what you need and press <b>Update</b>. <b>Unpublish</b> turns it back into a draft.
            </li>
            <li>
              <b>Delete</b> removes the item and its photos from the website. Protected items (like the first articles) can’t be deleted here.
            </li>
            <li>Every change is saved in the website’s history, so mistakes can always be undone by the developer.</li>
          </ol>
        </Section>
        <Section title="Good to know">
          <ol className={c.steps}>
            <li>
              Articles: use the formatting buttons and <b>Preview</b> to see it exactly like the website. Paste a YouTube or Instagram link on its own line for a video.
            </li>
            <li>
              Gallery: choose a <b>category</b> for each album, use ← → to order photos and ★ to choose the cover.
            </li>
            <li>You stay signed in until you press Sign out. If a phone is lost, the password can be changed to sign everyone out.</li>
          </ol>
        </Section>
        <TeamCard person={dev} finish="diamond" kicker="Need help?" text="Something not working, or an idea for the admin? Message the developer directly — I’ll sort it out." />
      </div>
    </>
  );
}
