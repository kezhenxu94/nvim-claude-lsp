-- Auto-setup with defaults if user hasn't called setup() themselves.
-- This allows the plugin to work when added to runtimepath without explicit configuration.
if vim.g.claude_lsp_loaded then
  return
end
vim.g.claude_lsp_loaded = true

vim.schedule(function()
  if not vim.g.claude_lsp_configured then
    require("nvim-claude-lsp").setup()
  end
end)
