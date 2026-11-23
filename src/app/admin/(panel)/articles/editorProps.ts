import categories from "@/content/sources/local/article-categories.json";
import people from "@/content/sources/local/people.json";

export const articleEditorProps = {
  categories,
  people: people.map((p) => ({ id: p.id, name: p.name, role: p.role })),
};
