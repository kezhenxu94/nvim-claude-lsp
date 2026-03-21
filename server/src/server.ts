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
import { discoverSkills } from "./skills";

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

let rootPath = process.cwd();

// Merged command list: built-ins + user-installed skills.
// Built once on initialize and cached for the LSP session.
let allCommands: SlashCommand[] = [];

connection.onInitialize((params): InitializeResult => {
  if (params.rootUri) {
    rootPath = params.rootUri.replace("file://", "");
  } else if (params.rootPath) {
    rootPath = params.rootPath;
  }

  // Skills override built-ins with the same name.
  const skills = discoverSkills();
  const skillNames = new Set(skills.map((s) => s.name));
  allCommands = [
    ...BUILTIN_COMMANDS.filter((c) => !skillNames.has(c.name)),
    ...skills,
  ];

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
  return getCompletions(doc, params.position, rootPath, allCommands);
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
  return getHover(doc, params.position, allCommands);
});

documents.listen(connection);
connection.listen();
