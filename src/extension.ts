import * as vscode from "vscode";
import { chatOllama, setupOllama } from "./ollama-service";
import { setupPanel } from "./panel-service";

let Panel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext): void {
  // menu title buttonクリック時のイベントトリガー
  // 1. panelを開いてOllamaを起動
  // 2. panelが開いていれば閉じる
  const panelDisposable = vscode.commands.registerCommand(
    "preview.open",
    async () => {
      Panel = setupPanel(Panel, context, () => {
        Panel = undefined;
      });
      if (!Panel) {
        return;
      }

      const ollamaEnabled = await setupOllama();
      if (!ollamaEnabled) {
        return;
      }
    },
  );
  context.subscriptions.push(panelDisposable);

  // ファイル保存時のイベントトリガー
  // 1. 保存したファイルについてレビューする
  const saveTextDisposable = vscode.workspace.onDidSaveTextDocument(
    async (document: vscode.TextDocument) => {
      if (!Panel) {
        return;
      }

      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && activeEditor.document === document) {
        const fileContent = document.getText();

        Panel.webview.postMessage({ command: "clearContent" });

        let accumulatedContent = "";
        const response = chatOllama(fileContent);
        for await (const content of response) {
          accumulatedContent += content;
          Panel.webview.postMessage({
            command: "updateContent",
            content: accumulatedContent,
          });
        }
      }
    },
  );
  context.subscriptions.push(saveTextDisposable);
}

export function deactivate(): void {
  return;
}
