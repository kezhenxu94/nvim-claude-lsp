import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { spawnSync } from "child_process";
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
 * Run `claude plugins list --json` and return the `skills/` directory path
 * for each enabled plugin. Falls back to an empty list if the CLI is unavailable.
 */
function getEnabledPluginSkillDirs(): string[] {
  try {
    const result = spawnSync("claude", ["plugins", "list", "--json"], {
      encoding: "utf8",
      timeout: 3000,
    });
    if (result.status !== 0 || !result.stdout) return [];
    const plugins: Array<{ enabled: boolean; installPath: string }> = JSON.parse(result.stdout);
    return plugins
      .filter((p) => p.enabled)
      .map((p) => path.join(p.installPath, "skills"));
  } catch {
    return [];
  }
}

/**
 * Discover Claude Code skills from (in priority order):
 *   1. <projectDir>/.claude/        — project-local skills (highest priority)
 *   2. <plugin installPath>/skills/ — enabled plugins (via `claude plugins list --json`)
 *   3. ~/.claude/plugins/           — fallback if claude CLI is unavailable
 *
 * Higher-priority skills override lower-priority ones with the same name.
 */
export function discoverSkills(projectDir?: string): SlashCommand[] {
  const skills: SlashCommand[] = [];
  const seen = new Set<string>();

  const dirs: string[] = [];

  // 1. Project-local (highest priority)
  if (projectDir) {
    dirs.push(path.join(projectDir, ".claude"));
  }

  // 2. Enabled plugins via CLI; fallback to scanning ~/.claude/plugins/ directly
  const pluginDirs = getEnabledPluginSkillDirs();
  if (pluginDirs.length > 0) {
    dirs.push(...pluginDirs);
  } else {
    dirs.push(path.join(os.homedir(), ".claude", "plugins"));
  }

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
  }

  return skills;
}
