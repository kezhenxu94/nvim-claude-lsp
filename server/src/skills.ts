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
 * Discover Claude Code skills from two locations (in priority order):
 *   1. <projectDir>/.claude/  — project-local skills (highest priority)
 *   2. ~/.claude/plugins/     — globally installed skills
 *
 * Project-local skills override global ones with the same name.
 */
export function discoverSkills(projectDir?: string, pluginsDir?: string): SlashCommand[] {
  const globalDir = pluginsDir ?? path.join(os.homedir(), ".claude", "plugins");
  const skills: SlashCommand[] = [];
  const seen = new Set<string>();

  // Scan in priority order: project-local first, global second.
  const dirs: string[] = [];
  if (projectDir) {
    dirs.push(path.join(projectDir, ".claude"));
  }
  dirs.push(globalDir);

  for (const dir of dirs) {
    for (const filePath of walkMarkdownFiles(dir)) {
      let content: string;
      try {
        content = fs.readFileSync(filePath, "utf8");
      } catch {
        continue;
      }

      const fm = parseFrontmatter(content);
      if (!fm?.name) continue;

      const cmdName = fm.name.startsWith("/") ? fm.name : `/${fm.name}`;
      if (seen.has(cmdName)) continue; // project-local already registered
      seen.add(cmdName);

      skills.push({
        name: cmdName,
        detail: fm.description ?? "User-installed skill",
        documentation: fm.description
          ? `**${cmdName}**\n\n${fm.description}`
          : `**${cmdName}** — user-installed skill`,
      });
    }
  }

  return skills;
}
