import { readLocks, LOCKABLE } from "@/lib/admin/locks";
import { attempt, PageHead, SetupNotice } from "@/components/admin/Page";
import { LocksEditor } from "@/components/admin/LocksEditor";

export const metadata = { title: "Locks" };

export default async function LocksPage() {
  const r = await attempt(() => readLocks());
  return (
    <>
      <PageHead
        kicker="Settings"
        title="Locks"
        lede="Lock a section so it can't be changed in the admin without the lock password. Turning locks on or off also needs the lock password."
      />
      {r.error && <SetupNotice>{r.error}</SetupNotice>}
      {r.data && <LocksEditor sections={Object.entries(LOCKABLE).map(([id, label]) => ({ id, label }))} initial={r.data} />}
    </>
  );
}
