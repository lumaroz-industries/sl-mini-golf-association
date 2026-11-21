import "server-only";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema, type Options as SanitizeSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import { toJsxRuntime, type Components } from "hast-util-to-jsx-runtime";
import type { Root as MdRoot, RootContent as MdNode, Paragraph, Image, Link, PhrasingContent } from "mdast";
import type { Root as HRoot, Element, ElementContent } from "hast";
import { Embed } from "@/components/articles/Embed";

/**
 * Article Markdown → React, on the server.
 *
 * Authoring conventions (see the article template):
 *  - A YouTube or Instagram link on its own line becomes a tap-to-load embed.
 *  - An image on its own line becomes a figure; its title becomes the caption:
 *      ![Alt text](/articles/slug/photo.webp "Caption")
 *  - Several images in one paragraph become a gallery.
 * Output is sanitised, so content from the future CMS cannot inject markup.
 */

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

/* ------------------------------------------------------------ remark steps */

const YOUTUBE = [
  /^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:.*&)?v=([\w-]{11})/,
  /^https?:\/\/youtu\.be\/([\w-]{11})/,
  /^https?:\/\/(?:www\.)?youtube\.com\/(?:shorts|embed|live)\/([\w-]{11})/,
];
const INSTAGRAM = /^https?:\/\/(?:www\.)?instagram\.com\/(p|reel)\/([\w-]+)/;

function matchEmbed(url: string): { provider: "youtube" | "instagram"; id: string; kind?: string } | null {
  for (const re of YOUTUBE) {
    const m = url.match(re);
    if (m) return { provider: "youtube", id: m[1] };
  }
  const ig = url.match(INSTAGRAM);
  if (ig) return { provider: "instagram", id: ig[2], kind: ig[1] };
  return null;
}

const isBlank = (n: PhrasingContent) => n.type === "text" && n.value.trim() === "";

function remarkBlocks() {
  return (tree: MdRoot) => {
    tree.children = tree.children.map((node): MdNode => {
      if (node.type !== "paragraph") return node;
      const para = node as Paragraph;
      const kids = para.children.filter((c) => !isBlank(c));

      // A lone link to YouTube/Instagram → embed.
      if (kids.length === 1 && kids[0].type === "link") {
        const link = kids[0] as Link;
        const embed = matchEmbed(link.url);
        if (embed) {
          return {
            type: "paragraph",
            children: [],
            data: {
              hName: "slm-embed",
              hProperties: { dataProvider: embed.provider, dataEmbedId: embed.id, dataKind: embed.kind ?? "", dataUrl: link.url },
            },
          } as Paragraph;
        }
      }

      // Images on their own → figure (one) or gallery (several).
      const images = kids.filter((c): c is Image => c.type === "image");
      if (images.length > 0 && images.length === kids.length) {
        const caption = images.length === 1 ? images[0].title : undefined;
        const children: PhrasingContent[] = [...images];
        if (caption) {
          children.push({ type: "emphasis", children: [{ type: "text", value: caption }], data: { hName: "figcaption" } });
        }
        return {
          type: "paragraph",
          children,
          data: { hName: "figure", hProperties: { dataCount: String(images.length), dataGallery: images.length > 1 ? "true" : undefined } },
        } as Paragraph;
      }
      return node;
    });
  };
}

/* --------------------------------------------------------------- sanitise */

const schema: SanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "figure", "figcaption", "slm-embed"],
  attributes: {
    ...defaultSchema.attributes,
    figure: ["dataCount", "dataGallery"],
    "slm-embed": ["dataProvider", "dataEmbedId", "dataKind", "dataUrl"],
    img: [...(defaultSchema.attributes?.img ?? []), "title"],
  },
  // Heading ids are added after sanitising, so no prefixing is needed.
  clobber: [],
};

/* ---------------------------------------------------------------- helpers */

function textOf(node: Element | ElementContent): string {
  if (node.type === "text") return node.value;
  if (node.type === "element") return node.children.map(textOf).join("");
  return "";
}

function collectToc(tree: HRoot): TocItem[] {
  const out: TocItem[] = [];
  for (const node of tree.children) {
    if (node.type === "element" && (node.tagName === "h2" || node.tagName === "h3") && typeof node.properties?.id === "string") {
      out.push({ id: node.properties.id, text: textOf(node), level: node.tagName === "h2" ? 2 : 3 });
    }
  }
  return out;
}

export function wordCount(markdown: string): number {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

const components: Partial<Components> = {
  // Articles have one H1 (the title); demote any in the body.
  h1: (props) => <h2 {...props} />,
  a: ({ href = "", ...props }) => {
    const external = /^https?:\/\//.test(href);
    return <a href={href} {...props} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} />;
  },
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  img: (props) => <img {...props} loading="lazy" decoding="async" />,
  table: (props) => (
    <div className="table-wrap">
      <table {...props} />
    </div>
  ),
  "slm-embed": (props: Record<string, unknown>) => (
    <Embed
      provider={props["data-provider"] as "youtube" | "instagram"}
      id={props["data-embed-id"] as string}
      kind={(props["data-kind"] as string) || undefined}
      url={props["data-url"] as string}
    />
  ),
} as Partial<Components>;

export async function renderMarkdown(markdown: string): Promise<{ content: React.ReactNode; toc: TocItem[] }> {
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkBlocks).use(remarkRehype).use(rehypeSanitize, schema).use(rehypeSlug);
  const tree = (await processor.run(processor.parse(markdown))) as HRoot;
  const toc = collectToc(tree);
  const content = toJsxRuntime(tree, { Fragment, jsx, jsxs, components });
  return { content, toc };
}
