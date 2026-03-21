local M = {}

M.config = {
  node_cmd = "node",
}

---@param opts? {node_cmd?: string}
function M.setup(opts)
  M.config = vim.tbl_deep_extend("force", M.config, opts or {})
  vim.g.claude_lsp_configured = true

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
