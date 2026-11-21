import type { GalleryAlbum } from "@/content/repository";
import type { AlbumMeta, WallPhoto } from "./types";

export function toWall(albums: GalleryAlbum[]): { photos: WallPhoto[]; metas: AlbumMeta[] } {
  return {
    photos: albums.flatMap((a) => a.photos.map(({ id, albumSlug, width, height, alt, caption, src, srcSet, blur }) => ({ id, albumSlug, width, height, alt, caption, src, srcSet, blur }))),
    metas: albums.map((a) => ({ slug: a.slug, title: a.title, date: a.date, city: a.city, description: a.description, count: a.photos.length })),
  };
}
