import "server-only";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * Where the admin reads and writes content. There is no database: content is
 * files in the repository, exactly as if they were edited by hand.
 *
 *  - On the live site (GitHub token set): every "Publish" is one commit to the
 *    repository through the GitHub API. Vercel sees the commit and rebuilds
 *    the site, so the change is live a minute or two later.
 *  - In local development (no token): files are written straight into this
 *    folder, so `npm run dev` shows changes immediately.
 */

export interface Change {
  path: string;
  /** Text content (UTF-8)… */
  text?: string;
  /** …or an uploaded binary, by the id returned from putBinary(). */
  blob?: string;
  /** …or delete this file. */
  delete?: true;
}

export interface Storage {
  kind: "github" | "local";
  readText(file: string): Promise<string | null>;
  readBinary(file: string): Promise<Buffer | null>;
  /** All files under a folder (recursive), as repository paths. */
  list(folder: string): Promise<string[]>;
  /** Stage a binary file; returns an id to use in commit(). */
  putBinary(data: Buffer): Promise<string>;
  readStaged(id: string): Promise<Buffer | null>;
  /** Apply all changes at once; returns the commit id (GitHub) or "local". */
  commit(message: string, changes: Change[]): Promise<string>;
}

export class StorageError extends Error {}

/* ------------------------------------------------------------------ config */

export function githubConfig() {
  const token = process.env.ADMIN_GITHUB_TOKEN?.trim();
  const repo =
    process.env.ADMIN_GITHUB_REPO?.trim() ||
    (process.env.VERCEL_GIT_REPO_OWNER && process.env.VERCEL_GIT_REPO_SLUG ? `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}` : "");
  const branch = process.env.ADMIN_GITHUB_BRANCH?.trim() || "main";
  const api = (process.env.ADMIN_GITHUB_API_URL?.trim() || "https://api.github.com").replace(/\/$/, "");
  return { token, repo, branch, api };
}

export function getStorage(): Storage {
  const gh = githubConfig();
  if (gh.token) {
    if (!/^[\w.-]+\/[\w.-]+$/.test(gh.repo)) throw new StorageError("ADMIN_GITHUB_REPO is not set (expected owner/repository).");
    return githubStorage(gh.token, gh.repo, gh.branch, gh.api);
  }
  if (process.env.VERCEL) throw new StorageError("Publishing is not set up yet: ADMIN_GITHUB_TOKEN is missing in Vercel.");
  return localStorage();
}

/* ------------------------------------------------------------------ GitHub */

function githubStorage(token: string, repo: string, branch: string, api: string): Storage {
  const base = `${api}/repos/${repo}`;

  async function gh<T>(method: string, url: string, body?: unknown): Promise<T> {
    const res = await fetch(url.startsWith("http") ? url : `${base}${url}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const err = new StorageError(
        res.status === 401 || res.status === 403
          ? "GitHub refused the request — check that ADMIN_GITHUB_TOKEN is valid and can write to the repository."
          : res.status === 404
            ? "not-found"
            : `GitHub error ${res.status}: ${text.slice(0, 300)}`,
      );
      (err as StorageError & { status?: number }).status = res.status;
      throw err;
    }
    return (await res.json()) as T;
  }

  type TreeEntry = { path: string; type: string; sha: string };
  const headTree = async () => {
    const ref = await gh<{ object: { sha: string } }>("GET", `/git/ref/heads/${encodeURIComponent(branch)}`);
    const commit = await gh<{ tree: { sha: string } }>("GET", `/git/commits/${ref.object.sha}`);
    return { head: ref.object.sha, tree: commit.tree.sha };
  };
  const fullTree = async () => {
    const { tree } = await headTree();
    const t = await gh<{ tree: TreeEntry[]; truncated: boolean }>("GET", `/git/trees/${tree}?recursive=1`);
    return t.tree.filter((e) => e.type === "blob");
  };
  const blobBySha = async (sha: string) => {
    const b = await gh<{ content: string; encoding: string }>("GET", `/git/blobs/${sha}`);
    return Buffer.from(b.content, b.encoding === "base64" ? "base64" : "utf8");
  };
  const fileSha = async (file: string) => {
    try {
      const r = await gh<{ sha: string; type: string }>("GET", `/contents/${file.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(branch)}`);
      return r.type === "file" ? r.sha : null;
    } catch (e) {
      if ((e as { status?: number }).status === 404) return null;
      throw e;
    }
  };

  return {
    kind: "github",
    async readBinary(file) {
      const sha = await fileSha(file);
      return sha ? blobBySha(sha) : null;
    },
    async readText(file) {
      const b = await this.readBinary(file);
      return b ? b.toString("utf8") : null;
    },
    async list(folder) {
      const prefix = folder.replace(/\/$/, "") + "/";
      return (await fullTree()).filter((e) => e.path.startsWith(prefix)).map((e) => e.path);
    },
    async putBinary(data) {
      const r = await gh<{ sha: string }>("POST", "/git/blobs", { content: data.toString("base64"), encoding: "base64" });
      return r.sha;
    },
    async readStaged(id) {
      if (!/^[0-9a-f]{40}$/.test(id)) return null;
      return blobBySha(id);
    },
    async commit(message, changes) {
      for (let attempt = 0; ; attempt++) {
        const { head, tree } = await headTree();
        const existing = new Set((await gh<{ tree: TreeEntry[] }>("GET", `/git/trees/${tree}?recursive=1`)).tree.map((e) => e.path));
        const entries = changes
          .filter((c) => !c.delete || existing.has(c.path))
          .map((c) =>
            c.delete
              ? { path: c.path, mode: "100644", type: "blob", sha: null }
              : c.blob
                ? { path: c.path, mode: "100644", type: "blob", sha: c.blob }
                : { path: c.path, mode: "100644", type: "blob", content: c.text ?? "" },
          );
        if (!entries.length) return head;
        const newTree = await gh<{ sha: string }>("POST", "/git/trees", { base_tree: tree, tree: entries });
        const commit = await gh<{ sha: string }>("POST", "/git/commits", { message, tree: newTree.sha, parents: [head] });
        try {
          await gh("PATCH", `/git/refs/heads/${encodeURIComponent(branch)}`, { sha: commit.sha, force: false });
          return commit.sha;
        } catch (e) {
          // Someone else committed in between: rebuild on top of the new head once.
          if ((e as { status?: number }).status === 422 && attempt < 2) continue;
          throw e;
        }
      }
    },
  };
}

/* ------------------------------------------------------------------- local */

function localStorage(): Storage {
  // Local development only: keep the build from bundling the whole project for this.
  const root = /*turbopackIgnore: true*/ process.cwd();
  const staging = path.join(os.tmpdir(), "slmga-admin-staging");
  const abs = (file: string) => {
    const p = path.resolve(/*turbopackIgnore: true*/ root, file);
    if (!p.startsWith(root + path.sep)) throw new StorageError("Invalid path.");
    return p;
  };
  const walk = async (dir: string): Promise<string[]> => {
    if (!existsSync(dir)) return [];
    const out: string[] = [];
    for (const d of await readdir(dir, { withFileTypes: true })) {
      const p = path.join(dir, d.name);
      if (d.isDirectory()) out.push(...(await walk(p)));
      else out.push(path.relative(root, p).split(path.sep).join("/"));
    }
    return out;
  };
  return {
    kind: "local",
    async readBinary(file) {
      try {
        return await readFile(abs(file));
      } catch {
        return null;
      }
    },
    async readText(file) {
      const b = await this.readBinary(file);
      return b ? b.toString("utf8") : null;
    },
    list: (folder) => walk(abs(folder)),
    async putBinary(data) {
      await mkdir(staging, { recursive: true });
      const id = createHash("sha1").update(data).digest("hex");
      await writeFile(path.join(staging, id), data);
      return id;
    },
    async readStaged(id) {
      if (!/^[0-9a-f]{40}$/.test(id)) return null;
      try {
        return await readFile(path.join(staging, id));
      } catch {
        return null;
      }
    },
    async commit(_message, changes) {
      for (const c of changes) {
        const p = abs(c.path);
        if (c.delete) {
          await rm(p, { force: true });
          continue;
        }
        await mkdir(path.dirname(p), { recursive: true });
        if (c.blob) {
          const data = await this.readStaged(c.blob);
          if (!data) throw new StorageError("An uploaded file has expired — please upload it again.");
          await writeFile(p, data);
        } else await writeFile(p, c.text ?? "");
      }
      return "local";
    },
  };
}
