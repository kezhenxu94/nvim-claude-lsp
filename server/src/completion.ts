import {
  CompletionItem,
  CompletionItemKind,
  Position,
  InsertTextFormat,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import * as fs from "fs";
import * as path from "path";
import { SlashCommand } from "./commands";

type TriggerContext =
  | { type: "slash"; prefix: string }
  | { type: "at"; prefix: string }
  | { type: "none" };

export function getTriggerContext(lineText: string): TriggerContext {
  // Match a slash command at start of line or after whitespace
  const slashMatch = lineText.match(/(?:^|\s)(\/\w*)$/);
  if (slashMatch) return { type: "slash", prefix: slashMatch[1] };

  // Match @ reference
  const atMatch = lineText.match(/@(\S*)$/);
  if (atMatch) return { type: "at", prefix: atMatch[1] };

  return { type: "none" };
}

export function getSlashCompletions(prefix: string, commands: SlashCommand[]): CompletionItem[] {
  return commands
    .filter((cmd) => cmd.name.startsWith(prefix))
    .map((cmd) => ({
      label: cmd.name,
      kind: CompletionItemKind.Function,
      detail: cmd.detail,
      // Documentation deferred to completionItem/resolve
      data: { type: "slash", name: cmd.name },
      insertText: cmd.name.slice(prefix.length),
      insertTextFormat: InsertTextFormat.PlainText,
    }));
}

export async function getFileCompletions(prefix: string, rootPath: string): Promise<CompletionItem[]> {
  const items: CompletionItem[] = [];
  const searchDir = prefix.includes("/")
    ? path.join(rootPath, prefix.substring(0, prefix.lastIndexOf("/")))
    : rootPath;

  try {
    const entries = walkDir(searchDir, rootPath, 0, 3);
    for (const entry of entries) {
      const relativePath = path.relative(rootPath, entry.fullPath);
      if (!relativePath.startsWith(prefix)) continue;
      items.push({
        label: "@" + relativePath,
        kind: entry.isDir ? CompletionItemKind.Folder : CompletionItemKind.File,
        detail: entry.isDir ? "directory" : "file",
        data: { type: "file", path: relativePath },
        insertText: relativePath.slice(prefix.length),
        insertTextFormat: InsertTextFormat.PlainText,
      });
      if (items.length >= 50) break;
    }
  } catch {
    // Ignore filesystem errors
  }

  return items;
}

interface DirEntry {
  fullPath: string;
  isDir: boolean;
}

function walkDir(dir: string, rootPath: string, depth: number, maxDepth: number): DirEntry[] {
  if (depth > maxDepth) return [];
  const results: DirEntry[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  for (const entry of entries) {
    // Skip hidden files and common noise directories
    if (entry.name.startsWith(".")) continue;
    if (["node_modules", ".git", "dist", "__pycache__"].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    results.push({ fullPath, isDir: entry.isDirectory() });
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, rootPath, depth + 1, maxDepth));
    }
  }
  return results;
}

export async function getCompletions(
  doc: TextDocument,
  position: Position,
  rootPath: string,
  commands: SlashCommand[]
): Promise<CompletionItem[]> {
  const lineText = doc.getText({
    start: { line: position.line, character: 0 },
    end: position,
  });

  const ctx = getTriggerContext(lineText);

  if (ctx.type === "slash") {
    return getSlashCompletions(ctx.prefix, commands);
  }

  if (ctx.type === "at") {
    return getFileCompletions(ctx.prefix, rootPath);
  }

  return [];
}
