import { AlbumEditor } from "@/components/admin/AlbumEditor";
import { PageHead } from "@/components/admin/Page";

export const metadata = { title: "New album" };

export default function NewAlbum() {
  return (
    <>
      <PageHead kicker="Gallery" title="New album" />
      <AlbumEditor isNew initial={{}} />
    </>
  );
}
