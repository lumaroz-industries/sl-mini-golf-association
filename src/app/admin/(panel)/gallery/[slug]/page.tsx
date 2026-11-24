import { notFound } from "next/navigation";
import { readAlbum } from "@/lib/admin/content";
import { AlbumEditor } from "@/components/admin/AlbumEditor";
import galleryCategories from "@/content/sources/local/gallery-categories.json";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { attempt, PageHead, SetupNotice } from "@/components/admin/Page";

export const metadata = { title: "Edit album" };

export default async function EditAlbum({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await attempt(() => readAlbum(slug));
  if (r.error !== undefined) return <SetupNotice>{r.error}</SetupNotice>;
  if (!r.data) notFound();
  const { album, manifest } = r.data;
  const photos = album.photos
    .filter((p) => manifest[p.file])
    .map((p) => {
      const m = manifest[p.file];
      return { file: p.file, alt: p.alt, caption: p.caption, id: m.id, blur: m.blur, thumb: `/gallery/${slug}/${m.id}-${m.widths[0]}.webp` };
    });
  return (
    <>
      <PageHead kicker="Edit album" title={album.title} />
      <AlbumEditor key={slug} isNew={false} initial={{ ...album, slug, photos }} categories={galleryCategories} />
      <div style={{ marginTop: 40 }}>
        <DeleteButton collection="gallery" slug={slug} title={album.title} after="/admin/gallery" />
      </div>
    </>
  );
}
