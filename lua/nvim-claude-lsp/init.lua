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
  local node_cmd = M.config.node_cmd

  vim.api.nvim_create_autocmd({ "BufEnter", "BufRead" }, {
    group = vim.api.nvim_create_augroup("nvim-claude-lsp", { clear = true }),
    callback = function(ev)
      local bufname = vim.api.nvim_buf_get_name(ev.buf)
      if not M._is_claude_buffer(bufname) then return end

      vim.lsp.start({
        name = "claude_lsp",
        cmd = { node_cmd, server_js, "--stdio" },
        root_dir = vim.fn.getcwd(),
        capabilities = vim.lsp.protocol.make_client_capabilities(),
      }, { bufnr = ev.buf })
    end,
  })
end

return M
