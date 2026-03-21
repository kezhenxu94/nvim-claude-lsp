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
vim.pack.add("kezhenxu94/nvim-claude-lsp")
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
