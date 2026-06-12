/**
 * Fetches public-repo context (metadata, file tree, README, package.json)
 * for GitHub cards on the whiteboard. Unauthenticated — fine for public
 * repos; set GITHUB_TOKEN to raise rate limits / access private repos.
 */

const HEADERS: Record<string, string> = {
  Accept: "application/vnd.github+json",
  "User-Agent": "pegasus-ai",
  ...(process.env.GITHUB_TOKEN
    ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    : {}),
};

async function gh(url: string): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

export function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  const m = url.match(/github\.com\/([^/\s]+)\/([^/\s#?]+)/);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
}

export async function fetchRepoContext(url: string): Promise<string> {
  const parsed = parseRepoUrl(url);
  if (!parsed) return `Not a recognizable GitHub repo URL: ${url}`;
  const { owner, repo } = parsed;

  const metaRes = await gh(`https://api.github.com/repos/${owner}/${repo}`);
  if (!metaRes) {
    return `Repo ${owner}/${repo} could not be fetched (private, missing, or rate-limited). Treat it as an existing codebase whose contents are unknown.`;
  }
  const meta = await metaRes.json();
  const branch: string = meta.default_branch ?? "main";

  const parts: string[] = [
    `Repo: ${owner}/${repo} (${meta.language ?? "unknown language"}, ${meta.stargazers_count} stars)`,
    meta.description ? `Description: ${meta.description}` : "",
  ];

  const treeRes = await gh(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
  );
  if (treeRes) {
    const tree = await treeRes.json();
    const paths: string[] = (tree.tree ?? [])
      .filter((t: { type: string }) => t.type === "blob")
      .map((t: { path: string }) => t.path)
      .slice(0, 500);
    parts.push(`File tree (${paths.length} files shown):\n${paths.join("\n")}`);
  }

  const pkgRes = await gh(
    `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/package.json`
  );
  if (pkgRes) {
    parts.push(`package.json:\n${(await pkgRes.text()).slice(0, 4000)}`);
  }

  const readmeRes = await gh(
    `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`
  );
  if (readmeRes) {
    parts.push(`README.md:\n${(await readmeRes.text()).slice(0, 8000)}`);
  }

  return parts.filter(Boolean).join("\n\n");
}
