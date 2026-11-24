/**
 * Content the admin panel may edit but never delete. Removing an entry here
 * (in the source code) is the only way to make it deletable again.
 *
 *  1. The platform's first article (about the website).
 *  2. The article about the website's designer — add its slug here once published.
 */
export const PROTECTED_ARTICLES: readonly string[] = ["beyond-the-green-inside-sl-mini-golf-association"];

export const isProtected = (collection: string, slug: string) => collection === "articles" && PROTECTED_ARTICLES.includes(slug);
