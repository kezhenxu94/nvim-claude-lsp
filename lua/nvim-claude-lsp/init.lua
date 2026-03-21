local M = {}

M.config = {
  node_cmd = "node",
}

-- Define Claude-specific highlight groups (linked to standard groups by default).
-- Users can override these in their colorscheme or after/plugin/*.lua.
local function define_highlights()
  vim.api.nvim_set_hl(0, "ClaudeSlashCommand", { default = true, link = "Special" })
  vim.api.nvim_set_hl(0, "ClaudeAtMention", { default = true, link = "Identifier" })
end

-- Register the markdown treesitter parser for the markdown.claude compound
-- filetype so that markdown treesitter highlighting continues to work.
local function setup_treesitter()
  if vim.treesitter and vim.treesitter.language and vim.treesitter.language.register then
    pcall(vim.treesitter.language.register, "markdown", "markdown.claude")
  end
end

-- Add buffer-local syntax patterns for Claude-specific inline syntax.
-- These run on top of (or as fallback to) treesitter markdown highlighting.
local function setup_syntax(buf)
  vim.api.nvim_buf_call(buf, function()
    -- /command  and  /plugin:command
    vim.cmd([[syntax match ClaudeSlashCommand "\v/[a-zA-Z][a-zA-Z0-9_-]*(:[a-zA-Z][a-zA-Z0-9_-]*)?"]])
    -- @file, @plugin, @path/to/file
    vim.cmd([[syntax match ClaudeAtMention "\v\@[a-zA-Z0-9._/-]+"]])
  end)
end

---@param opts? {node_cmd?: string}
function M.setup(opts)
  M.config = vim.tbl_deep_extend("force", M.config, opts or {})
  vim.g.claude_lsp_configured = true

  define_highlights()
  setup_treesitter()

  -- Set filetype=markdown.claude on Claude Code buffers:
  --   1. Ctrl+G chat input:   claude-prompt-<uuid>.md  (any temp dir)
  --   2. ~/.claude/*.md        MEMORY.md and other top-level files
  --   3. ~/.claude/**/*.md     plans/, memory/, and any other subdir
  -- Compound filetype: markdown syntax/treesitter still applies,
  -- but the LSP targets only this specific filetype.
  local home = vim.fn.expand("~")
  vim.api.nvim_create_autocmd({ "BufReadPost", "BufNewFile" }, {
    group = vim.api.nvim_create_augroup("nvim-claude-lsp-ft", { clear = true }),
    pattern = {
      "claude-prompt-*.md",
      home .. "/.claude/*.md",
      home .. "/.claude/**/*.md",
    },
    callback = function(ev)
      vim.bo[ev.buf].filetype = "markdown.claude"
      -- Schedule so syntax rules apply after the filetype event chain settles.
      vim.schedule(function()
        setup_syntax(ev.buf)
      end)
    end,
  })

  -- Resolve absolute path to dist/server.js relative to this file.
  -- This file lives at: lua/nvim-claude-lsp/init.lua
  -- server.js lives at: server/dist/server.js  (three :h steps up, then descend)
  local plugin_root = vim.fn.fnamemodify(debug.getinfo(1, "S").source:sub(2), ":h:h:h")
  local server_js = plugin_root .. "/server/dist/server.js"

  vim.lsp.config("claude_lsp", {
    cmd = { M.config.node_cmd, server_js, "--stdio" },
    filetypes = { "markdown.claude" },
    root_dir = function(_bufnr, on_dir)
      on_dir(vim.fn.getcwd())
    end,
  })

  vim.lsp.enable("claude_lsp")
end

return M
