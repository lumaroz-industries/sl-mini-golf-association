import { listOfficials } from "@/lib/admin/content";
import { attempt, PageHead, SetupNotice } from "@/components/admin/Page";
import { OfficialsList } from "@/components/admin/OfficialsList";

export const metadata = { title: "Officials" };

export default async function OfficialsAdmin() {
  const r = await attempt(() => listOfficials());
  return (
    <>
      <PageHead
        kicker="Officials"
        title="Officials"
        lede="The officials on the Officials page, by level. Add, edit or remove them, change their photos, and set the order they appear in."
        action={{ href: "/admin/officials/new", label: "+ New official" }}
      />
      {r.error && <SetupNotice>{r.error}</SetupNotice>}
      {r.data && <OfficialsList levels={r.data.levels} initial={r.data.officials} />}
    </>
  );
}
