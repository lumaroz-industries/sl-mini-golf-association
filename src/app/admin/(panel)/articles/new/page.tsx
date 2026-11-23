import { ArticleEditor } from "@/components/admin/ArticleEditor";
import { PageHead } from "@/components/admin/Page";
import { articleEditorProps } from "../editorProps";

export const metadata = { title: "New article" };

export default function NewArticle() {
  return (
    <>
      <PageHead kicker="Articles" title="New article" />
      <ArticleEditor isNew initial={{}} body="" {...articleEditorProps} />
    </>
  );
}
