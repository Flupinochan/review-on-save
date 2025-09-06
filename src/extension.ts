import * as vscode from "vscode";
import { OllamaService } from "./ollama-service";
import { setupPanel } from "./panel-service";
import { ReviewModelProvider } from "./review-model-provider";

let Panel: vscode.WebviewPanel | undefined;

/**
 * Model選択一覧初期化
 * @param reviewModelProvider
 * @returns
 */
function setupModelView(
  reviewModelProvider: ReviewModelProvider,
): vscode.Disposable {
  vscode.window.createTreeView("review-model", {
    treeDataProvider: reviewModelProvider,
    canSelectMany: false,
    showCollapseAll: false,
  });

  const radioSelectDisposable = vscode.commands.registerCommand(
    "radio.select",
    (model: string) => {
      reviewModelProvider.selectModel(model);
    },
  );
  return radioSelectDisposable;
}

/**
 * 拡張機能アクティベート時初期化処理
 * @param context
 */
export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  const ollamaService = new OllamaService();
  const models = await ollamaService.getAvailableModels();
  const reviewModelProvider = new ReviewModelProvider(models);

  const radioSelectDisposable = setupModelView(reviewModelProvider);
  context.subscriptions.push(radioSelectDisposable);

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

      const ollamaEnabled = await ollamaService.setupOllama();
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
        const response = ollamaService.chatOllama(
          fileContent,
          reviewModelProvider.getSelectedModel(),
        );
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
