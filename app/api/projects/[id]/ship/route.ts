import { NextResponse } from "next/server";
import { artifactsToFiles } from "@/lib/ship";
import { getProject } from "@/lib/store";
import { getOwner } from "@/lib/session";

export const maxDuration = 300;

const GH = "https://api.github.com";

function ghHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "pegasus-lab",
    "Content-Type": "application/json",
  };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const owner = await getOwner();
  const project = await getProject(id, owner);
  if (!project) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = await req.json();
  const token: string | undefined = body.token || process.env.GITHUB_TOKEN;
  const repoName: string = (body.repo || "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();

  if (!token) {
    return NextResponse.json(
      { error: "A GitHub token is required (paste one, or set GITHUB_TOKEN on the server)." },
      { status: 400 }
    );
  }
  if (!repoName) {
    return NextResponse.json({ error: "Repository name is required." }, { status: 400 });
  }

  const files = artifactsToFiles(project, project.blueprint, project.generated ?? []);
  if (files.length === 0) {
    return NextResponse.json({ error: "Nothing to ship yet — generate some code first." }, { status: 400 });
  }

  try {
    // Who are we?
    const userRes = await fetch(`${GH}/user`, { headers: ghHeaders(token) });
    if (!userRes.ok) {
      return NextResponse.json(
        { error: "GitHub rejected the token (check scopes: repo)." },
        { status: 401 }
      );
    }
    const login: string = (await userRes.json()).login;

    // Create the repo; 422 means it already exists — ship into it.
    const createRes = await fetch(`${GH}/user/repos`, {
      method: "POST",
      headers: ghHeaders(token),
      body: JSON.stringify({
        name: repoName,
        description: `${project.name} — built with pegasus lab.`,
        private: true,
        auto_init: true,
      }),
    });
    if (!createRes.ok && createRes.status !== 422) {
      const err = await createRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: `Could not create repo: ${err.message ?? createRes.status}` },
        { status: 502 }
      );
    }
    // Fresh repos need a beat before the contents API works.
    if (createRes.ok) await new Promise((r) => setTimeout(r, 1500));

    const shippedFiles: string[] = [];
    for (const file of files) {
      const url = `${GH}/repos/${login}/${repoName}/contents/${file.path
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`;

      // Existing file? Need its sha to update.
      let sha: string | undefined;
      const head = await fetch(url, { headers: ghHeaders(token) });
      if (head.ok) sha = (await head.json()).sha;

      const put = await fetch(url, {
        method: "PUT",
        headers: ghHeaders(token),
        body: JSON.stringify({
          message: `pegasus lab: ship ${file.path}`,
          content: Buffer.from(file.content, "utf8").toString("base64"),
          ...(sha ? { sha } : {}),
        }),
      });
      if (put.ok) shippedFiles.push(file.path);
    }

    return NextResponse.json({
      url: `https://github.com/${login}/${repoName}`,
      files: shippedFiles,
      failed: files.length - shippedFiles.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ship failed" },
      { status: 500 }
    );
  }
}
