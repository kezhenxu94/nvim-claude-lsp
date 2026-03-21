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

export interface Plugin {
  /** Display name — the part before `@` in the plugin id, e.g. "context7" */
  name: string;
  /** Full plugin id, e.g. "context7@claude-plugins-official" */
  id: string;
  installPath: string;
}

/**
 * Run `claude plugins list --json` and return metadata for all enabled plugins.
 * Falls back to an empty list if the CLI is unavailable.
 */
export function discoverPlugins(): Plugin[] {
  try {
    const result = spawnSync("claude", ["plugins", "list", "--json"], {
      encoding: "utf8",
      timeout: 3000,
    });
    if (result.status !== 0 || !result.stdout) return [];
    const raw: Array<{ id: string; enabled: boolean; installPath: string }> = JSON.parse(
      result.stdout
    );
    return raw
      .filter((p) => p.enabled)
      .map((p) => ({
        name: p.id.split("@")[0], // "context7@claude-plugins-official" → "context7"
        id: p.id,
        installPath: p.installPath,
      }));
  } catch {
    return [];
  }
}

/**
 * Return the `skills/` directory path for each enabled plugin.
 * Falls back to scanning ~/.claude/plugins/ directly if CLI is unavailable.
 */
function getEnabledPluginSkillDirs(): string[] {
  const plugins = discoverPlugins();
  if (plugins.length > 0) {
    return plugins.map((p) => path.join(p.installPath, "skills"));
  }
  return [];
}

/**
 * Read plugin metadata from ~/.claude/plugins/installed_plugins.json.
 * Used as a fallback when `claude plugins list --json` is unavailable.
 */
function discoverPluginsFromFile(): Plugin[] {
  const jsonPath = path.join(os.homedir(), ".claude", "plugins", "installed_plugins.json");
  try {
    const raw = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    const result: Plugin[] = [];
    for (const [id, entries] of Object.entries(raw.plugins ?? {})) {
      const arr = entries as Array<{ installPath: string }>;
      if (arr.length > 0) {
        result.push({ name: id.split("@")[0], id, installPath: arr[0].installPath });
      }
    }
    return result;
  } catch {
    return [];
  }
}

/**
 * Discover slash commands from installed plugins' `commands/` directories.
 * Command name uses the namespaced form `/<plugin>:<cmd>` (e.g. `/commit-commands:commit`).
 * Falls back to reading installed_plugins.json if the CLI is unavailable.
 */
export function discoverPluginCommands(): SlashCommand[] {
  const commands: SlashCommand[] = [];
  const seen = new Set<string>();

  let plugins = discoverPlugins();
  if (plugins.length === 0) {
    plugins = discoverPluginsFromFile();
  }

  for (const plugin of plugins) {
    const commandsDir = path.join(plugin.installPath, "commands");
    for (const filePath of walkMarkdownFiles(commandsDir)) {
      const cmdName = `/${plugin.name}:${path.basename(filePath, ".md")}`;
      if (seen.has(cmdName)) continue;
      seen.add(cmdName);

      let content: string;
      try {
        content = fs.readFileSync(filePath, "utf8");
      } catch {
        continue;
      }

      const fm = parseFrontmatter(content);
      const desc = fm?.description ?? "Plugin command";
      commands.push({
        name: cmdName,
        detail: `(${plugin.name}) ${desc}`,
        documentation: `**${cmdName}**\n\n${desc}`,
      });
    }
  }

  return commands;
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

  // 2. Enabled plugin skill dirs via CLI; fallback to scanning ~/.claude/plugins/ directly
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
