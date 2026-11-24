/** Serializable shapes passed from server pages to the client gallery. */
export interface WallPhoto {
  id: string;
  albumSlug: string;
  width: number;
  height: number;
  alt: string;
  caption?: string;
  src: string;
  srcSet: string;
  blur: string;
}

export interface AlbumMeta {
  slug: string;
  title: string;
  date: string;
  category?: string;
  cover?: { src: string; srcSet: string; blur: string; alt: string; width: number; height: number };
  city?: string;
  description?: string;
  count: number;
}
