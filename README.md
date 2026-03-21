# nvim-claude-lsp

LSP-powered completions for [Claude Code CLI](https://claude.ai/code) chat input in Neovim.

When you press **Ctrl+G** in Claude Code to compose a message in Neovim, this plugin activates LSP completions for:

- **Slash commands**: `/help`, `/clear`, `/compact`, `/memory`, `/model`, and more — with inline documentation
- **User-installed skills**: auto-discovered from `~/.claude/plugins/` at startup
- **File references**: `@path/to/file` completions from your project root

## Requirements

- Neovim 0.11+
- Node.js 18+

## Installation

**vim.pack** (built-in Neovim package manager):
```lua
vim.pack.add({ "https://github.com/kezhenxu94/nvim-claude-lsp" })
require("nvim-claude-lsp").setup()
```

**lazy.nvim**:
```lua
{
  "kezhenxu94/nvim-claude-lsp",
  ft = { "markdown", "text" },
  opts = {},
}
```

## Configuration

```lua
require("nvim-claude-lsp").setup({
  -- Path to node binary (default: "node")
  node_cmd = "node",
})
```

## Syntax Highlighting

Claude buffers get syntax highlighting for Claude-specific inline syntax on top of standard Markdown:

| Pattern | Examples | Highlight group |
|---------|----------|-----------------|
| Slash commands | `/help`, `/compact`, `/commit-commands:commit` | `ClaudeSlashCommand` |
| @-mentions | `@file.ts`, `@src/lib/`, `@plugin` | `ClaudeAtMention` |

Both groups are linked to standard groups by default (`Special` and `Identifier` respectively) so they pick up your colorscheme automatically. Override them in your config:

```lua
vim.api.nvim_set_hl(0, "ClaudeSlashCommand", { fg = "#ff9e64", bold = true })
vim.api.nvim_set_hl(0, "ClaudeAtMention",    { fg = "#7dcfff" })
```

If the `markdown` treesitter parser is installed, it is automatically used for Claude buffers so standard Markdown highlighting (headings, code blocks, bold/italic, etc.) continues to work.

## How It Works

When Claude Code opens Neovim with a temp file in `/tmp/claude-<uid>/`, this plugin detects the buffer by its path pattern and attaches a custom LSP server. The LSP server:

1. **On startup** — scans `~/.claude/plugins/` for skill markdown files (reads `name` + `description` from YAML frontmatter) and merges them with built-in commands
2. **On `textDocument/completion`** — returns slash commands or `@file` completions depending on trigger character
3. **On `textDocument/hover`** — returns documentation for the `/command` under the cursor

The bundled `server/dist/server.js` means no `npm install` is needed at runtime — only a Node.js runtime is required.

## Contributing

To rebuild the LSP server after TypeScript changes:
```bash
make build
```
