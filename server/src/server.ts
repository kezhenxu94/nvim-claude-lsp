import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  TextDocumentSyncKind,
  InitializeResult,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { getCompletions } from "./completion";
import { getHover } from "./hover";
import { BUILTIN_COMMANDS, SlashCommand } from "./commands";
import { discoverSkills, discoverPluginCommands, discoverPlugins, Plugin } from "./skills";

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

let rootPath = process.cwd();

// Merged command list and plugin list — built once on initialize.
let allCommands: SlashCommand[] = [];
let allPlugins: Plugin[] = [];

connection.onInitialize((params): InitializeResult => {
  if (params.rootUri) {
    rootPath = params.rootUri.replace("file://", "");
  } else if (params.rootPath) {
    rootPath = params.rootPath;
  }

  // Skills and plugin commands override built-ins with the same name.
  const skills = discoverSkills(rootPath);
  const pluginCommands = discoverPluginCommands();
  const overrideNames = new Set([...skills.map((s) => s.name), ...pluginCommands.map((c) => c.name)]);
  allCommands = [
    ...BUILTIN_COMMANDS.filter((c) => !overrideNames.has(c.name)),
    ...skills,
    ...pluginCommands,
  ];

  allPlugins = discoverPlugins();

  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        triggerCharacters: ["/", "@"],
        resolveProvider: true,
      },
      hoverProvider: true,
    },
  };
});

connection.onCompletion(async (params) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;
  return getCompletions(doc, params.position, rootPath, allCommands, allPlugins);
});

connection.onCompletionResolve((item) => {
  if (item.data?.type === "slash") {
    const cmd = allCommands.find((c) => c.name === item.data.name);
    if (cmd) {
      item.documentation = { kind: "markdown", value: cmd.documentation };
    }
  }
  return item;
});

connection.onHover((params) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;
  return getHover(doc, params.position, allCommands, allPlugins);
});

documents.listen(connection);
connection.listen();
