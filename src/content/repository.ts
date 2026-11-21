/**
 * Content repository — the ONLY way UI code reads editable content.
 *
 * Today the data comes from local JSON files (./sources/local). When the
 * admin CMS is built, replace the `source` implementation with a database
 * or API-backed one; the function signatures and returned types stay the
 * same, so no component needs to change.
 */
import "server-only";
import { cache } from "react";
import { z } from "zod";
import { HomeContent, Person, SiteSettings, type SocialLink } from "./schema";
import siteJson from "./sources/local/site.json";
import homeJson from "./sources/local/home.json";
import peopleJson from "./sources/local/people.json";

interface ContentSource {
  site(): Promise<unknown>;
  home(): Promise<unknown>;
  people(): Promise<unknown>;
}

const localSource: ContentSource = {
  site: async () => siteJson,
  home: async () => homeJson,
  people: async () => peopleJson,
};

const source: ContentSource = localSource;

function parse<T extends z.ZodType>(schema: T, data: unknown, label: string): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid ${label} content:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export const getSiteSettings = cache(async (): Promise<SiteSettings> =>
  parse(SiteSettings, await source.site(), "site settings"),
);

export const getHomeContent = cache(async (): Promise<HomeContent> =>
  parse(HomeContent, await source.home(), "homepage"),
);

export const getPeople = cache(async (): Promise<Person[]> =>
  parse(z.array(Person), await source.people(), "people"),
);

export async function getPeopleByIds(ids: string[]): Promise<Person[]> {
  const people = await getPeople();
  return ids.map((id) => {
    const person = people.find((p) => p.id === id);
    if (!person) throw new Error(`Unknown person id "${id}" referenced in content`);
    return person;
  });
}

/** Only platforms with an official URL are returned — others stay hidden. */
export async function getActiveSocialLinks(): Promise<Array<SocialLink & { url: string }>> {
  const { social } = await getSiteSettings();
  return social.filter((s): s is SocialLink & { url: string } => Boolean(s.url));
}
