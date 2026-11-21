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
import { ArticleCategory, ArticlesPageContent, ContactContent, HomeContent, Person, SiteSettings, SocialPageContent, type ImageAsset, type SocialLink } from "./schema";
import { loadArticles, type RawArticle } from "./articles";
import siteJson from "./sources/local/site.json";
import homeJson from "./sources/local/home.json";
import peopleJson from "./sources/local/people.json";
import contactJson from "./sources/local/contact.json";
import socialJson from "./sources/local/social.json";
import articlesPageJson from "./sources/local/articles.json";
import articleCategoriesJson from "./sources/local/article-categories.json";

interface ContentSource {
  site(): Promise<unknown>;
  home(): Promise<unknown>;
  people(): Promise<unknown>;
  contact(): Promise<unknown>;
  socialPage(): Promise<unknown>;
  articlesPage(): Promise<unknown>;
  articleCategories(): Promise<unknown>;
  articles(): Promise<RawArticle[]>;
}

const localSource: ContentSource = {
  site: async () => siteJson,
  home: async () => homeJson,
  people: async () => peopleJson,
  contact: async () => contactJson,
  socialPage: async () => socialJson,
  articlesPage: async () => articlesPageJson,
  articleCategories: async () => articleCategoriesJson,
  articles: loadArticles,
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

export const getContactContent = cache(async (): Promise<ContactContent> =>
  parse(ContactContent, await source.contact(), "contact page"),
);

export const getSocialPageContent = cache(async (): Promise<SocialPageContent> =>
  parse(SocialPageContent, await source.socialPage(), "social media page"),
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

/* ---------------------------------------------------------------- articles */

export const getArticlesPageContent = cache(async (): Promise<ArticlesPageContent> =>
  parse(ArticlesPageContent, await source.articlesPage(), "articles page"),
);

export const getArticleCategories = cache(async (): Promise<ArticleCategory[]> =>
  parse(z.array(ArticleCategory), await source.articleCategories(), "article categories"),
);

export interface ArticleAuthorView {
  name: string;
  role?: string;
  bio?: string;
  photo?: ImageAsset;
}

export interface Article extends Omit<RawArticle, "category" | "author"> {
  category: ArticleCategory;
  author: ArticleAuthorView;
}

/** Published articles, newest first, with category and author resolved. */
export const getArticles = cache(async (): Promise<Article[]> => {
  const [raw, categories, people] = await Promise.all([source.articles(), getArticleCategories(), getPeople()]);
  return raw.map((a) => {
    const category = categories.find((c) => c.id === a.category);
    if (!category) throw new Error(`Article "${a.slug}": unknown category "${a.category}". Use one of: ${categories.map((c) => c.id).join(", ")}.`);
    let author: ArticleAuthorView;
    if ("personId" in a.author) {
      const id = a.author.personId;
      const p = people.find((x) => x.id === id);
      if (!p) throw new Error(`Article "${a.slug}": unknown author personId "${id}".`);
      author = { name: p.name, role: p.role, photo: p.portrait };
    } else {
      author = { name: a.author.name, bio: a.author.bio, photo: a.author.photo };
    }
    return { ...a, category, author };
  });
});

export async function getArticle(slug: string): Promise<Article | undefined> {
  return (await getArticles()).find((a) => a.slug === slug);
}

/** Same-category articles first, then the most recent others. */
export async function getRelatedArticles(article: Article, limit = 3): Promise<Article[]> {
  const others = (await getArticles()).filter((a) => a.slug !== article.slug);
  const same = others.filter((a) => a.category.id === article.category.id);
  return [...same, ...others.filter((a) => a.category.id !== article.category.id)].slice(0, limit);
}

