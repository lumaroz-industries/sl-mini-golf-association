import { PlayerEditor } from "@/components/admin/PlayerEditor";
import { PageHead } from "@/components/admin/Page";

export const metadata = { title: "New player" };

export default function NewPlayer() {
  return (
    <>
      <PageHead kicker="Players" title="New player" />
      <PlayerEditor isNew initial={{}} />
    </>
  );
}
