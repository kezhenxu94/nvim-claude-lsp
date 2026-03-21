import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { SlashCommand } from "./commands";

/** Parse YAML frontmatter from a markdown file. Returns null if none found. */
function parseFrontmatter(content: string): Record<string, string> | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const result: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    // Strip surrounding quotes if present
    const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (key && value) result[key] = value;
  }
  return result;
}

/** Walk a directory recursively, yielding .md file paths. */
function* walkMarkdownFiles(dir: string): Generator<string> {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkMarkdownFiles(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      yield fullPath;
    }
  }
}

/**
 * Discover user-installed Claude Code skills from ~/.claude/plugins/.
 * Returns them as SlashCommand objects (name prefixed with "/").
 */
export function discoverSkills(pluginsDir?: string): SlashCommand[] {
  const dir = pluginsDir ?? path.join(os.homedir(), ".claude", "plugins");
  const skills: SlashCommand[] = [];
  const seen = new Set<string>();

  for (const filePath of walkMarkdownFiles(dir)) {
    let content: string;
    try {
      content = fs.readFileSync(filePath, "utf8");
    } catch {
      continue;
    }

    const fm = parseFrontmatter(content);
    if (!fm?.name) continue;

    // Skill names may already have "/" prefix; normalize to always have it
    const cmdName = fm.name.startsWith("/") ? fm.name : `/${fm.name}`;
    if (seen.has(cmdName)) continue;
    seen.add(cmdName);

    skills.push({
      name: cmdName,
      detail: fm.description ?? "User-installed skill",
      documentation: fm.description
        ? `**${cmdName}**\n\n${fm.description}`
        : `**${cmdName}** — user-installed skill`,
    });
  }

  return skills;
}
