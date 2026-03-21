export interface SlashCommand {
  name: string; // e.g. "/clear"
  detail: string; // one-line shown in completion menu
  documentation: string; // markdown shown in hover/resolve
}

// Built-in Claude Code commands that are always available.
// User-installed skills are discovered separately in skills.ts.
export const BUILTIN_COMMANDS: SlashCommand[] = [
  {
    name: "/help",
    detail: "Show help and available commands",
    documentation: "Displays a list of all available slash commands and their descriptions.",
  },
  {
    name: "/clear",
    detail: "Clear the conversation history",
    documentation: "Clears the current conversation history, starting fresh with an empty context.",
  },
  {
    name: "/compact",
    detail: "Compact conversation with optional focus",
    documentation:
      "Summarizes the conversation to save context window space.\n\nOptionally provide a focus topic:\n```\n/compact focus on the authentication module\n```",
  },
  {
    name: "/memory",
    detail: "Edit Claude's memory files (CLAUDE.md)",
    documentation:
      "Opens CLAUDE.md memory files for editing. Claude reads these files at session start to remember project context and preferences.",
  },
  {
    name: "/model",
    detail: "Switch the AI model",
    documentation:
      "Switch the underlying model. Examples:\n```\n/model opus\n/model sonnet\n/model haiku\n```",
  },
  {
    name: "/permissions",
    detail: "View and manage tool permissions",
    documentation:
      "Lists all tool permissions. Allows approving or denying tools (file read/write, bash, etc.) for this session.",
  },
  {
    name: "/review",
    detail: "Review pending file changes",
    documentation: "Shows a diff of all file changes made in the current session, letting you review before accepting.",
  },
  {
    name: "/vim",
    detail: "Toggle vim keybindings in the chat input",
    documentation: "Enables or disables vim modal keybindings (normal/insert/visual modes) in the chat input box.",
  },
  {
    name: "/bug",
    detail: "Report a bug to Anthropic",
    documentation: "Opens the bug report form, pre-filled with session context and recent conversation.",
  },
  {
    name: "/init",
    detail: "Initialize project with CLAUDE.md",
    documentation:
      "Analyzes the project structure, git history, and code patterns, then creates a CLAUDE.md file with project context.",
  },
  {
    name: "/doctor",
    detail: "Check Claude Code installation health",
    documentation:
      "Diagnoses common issues: Node.js version, authentication, network connectivity, and file permissions.",
  },
  {
    name: "/login",
    detail: "Sign in to your Anthropic account",
    documentation: "Opens the authentication flow for your Anthropic account via browser or API key.",
  },
  {
    name: "/logout",
    detail: "Sign out of your Anthropic account",
    documentation: "Clears stored credentials and API keys, signing you out of Claude Code.",
  },
  {
    name: "/cost",
    detail: "Show token usage and estimated cost",
    documentation:
      "Displays token usage statistics (input/output tokens) and estimated API cost for the current session.",
  },
  {
    name: "/config",
    detail: "Open Claude Code settings",
    documentation: "Opens the Claude Code configuration interface for adjusting settings and preferences.",
  },
  {
    name: "/terminal",
    detail: "Open a new terminal",
    documentation: "Opens a new terminal pane within the Claude Code interface.",
  },
  {
    name: "/status",
    detail: "Show connection and auth status",
    documentation: "Shows current connection status, authentication state, and active model information.",
  },
];
