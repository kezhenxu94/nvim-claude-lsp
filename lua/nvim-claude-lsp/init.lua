local M = {}

M.config = {
  -- Path to node binary
  node_cmd = "node",
}

--- Detect if a buffer is a Claude Code chat input buffer.
--- Matches the filename pattern Claude Code uses: claude-prompt-<uuid>.md
--- Works on macOS (/private/var/folders/.../T/) and Linux (/tmp/).
---@param bufname string
---@return boolean
function M._is_claude_buffer(bufname)
  if bufname:match("claude%-prompt%-[^/]+%.md$") then
    return true
  end
  return false
end

---@param opts? {node_cmd?: string}
function M.setup(opts)
  M.config = vim.tbl_deep_extend("force", M.config, opts or {})
  vim.g.claude_lsp_configured = true

  -- Resolve absolute path to dist/server.js relative to this file.
  -- This file lives at: lua/nvim-claude-lsp/init.lua
  -- server.js lives at: server/dist/server.js  (three :h steps up, then descend)
  local plugin_root = vim.fn.fnamemodify(debug.getinfo(1, "S").source:sub(2), ":h:h:h")
  local server_js = plugin_root .. "/server/dist/server.js"

  vim.lsp.config("claude_lsp", {
    cmd = { M.config.node_cmd, server_js, "--stdio" },
    -- Claude Code opens .md files or unnamed buffers; cover both
    filetypes = { "markdown", "text" },
    root_dir = function(bufnr, on_dir)
      local bufname = vim.api.nvim_buf_get_name(bufnr)
      if M._is_claude_buffer(bufname) then
        on_dir(vim.fn.getcwd())
      end
      -- If not a Claude buffer, on_dir is never called -> LSP does not activate
    end,
  })

  vim.lsp.enable("claude_lsp")
end

return M
