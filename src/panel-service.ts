import * as vscode from "vscode";
import type { AiServiceFactory } from "./ai-service/ai-service-factory";
import { getNonce, PREVIEW_COMMAND } from "./utils";
import type { ReviewModelProvider } from "./view-container/review-model-provider";

const CLEAR_PANEL_CONTENT = "clearPanelContent";
const UPDATE_PANEL_CONTENT = "updatePanelContent";

/**
 * Panel (Web View) を表示するクラス
 */
export class PanelService {
  private panel: vscode.WebviewPanel | undefined;
  private readonly context: vscode.ExtensionContext;
  private readonly aiServiceFactory: AiServiceFactory;
  private readonly reviewModelProvider: ReviewModelProvider;

  constructor(
    context: vscode.ExtensionContext,
    aiServiceFactory: AiServiceFactory,
    reviewModelProvider: ReviewModelProvider,
  ) {
    this.context = context;
    this.aiServiceFactory = aiServiceFactory;
    this.reviewModelProvider = reviewModelProvider;
  }

  /**
   * 初期化処理
   */
  initialize(): void {
    // preview.panelコマンドの登録
    const panelCommand = vscode.commands.registerCommand(
      PREVIEW_COMMAND,
      async () => {
        await this.togglePanel();
      },
    );

    // ファイル保存時のイベントリスナー登録
    const saveFileDocument = vscode.workspace.onDidSaveTextDocument(
      async (document: vscode.TextDocument) => {
        await this.fileSave(document);
      },
    );

    this.context.subscriptions.push(panelCommand);
    this.context.subscriptions.push(saveFileDocument);
  }

  /**
   * ファイル保存時の処理
   * @param document
   * @returns
   */
  private async fileSave(document: vscode.TextDocument): Promise<void> {
    if (!this.panel) {
      return;
    }

    // アクティブなファイルが保存された場合
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && activeEditor.document === document) {
      const fileContent = document.getText();

      // panelをクリア
      this.panel.webview.postMessage({ command: CLEAR_PANEL_CONTENT });

      let accumulatedContent = "";

      const aiService = this.aiServiceFactory.getAiService();
      const response = aiService.chat(
        fileContent,
        this.reviewModelProvider.getSelectedModel(),
      );

      for await (const content of response) {
        if (!this.panel) {
          break;
        }

        accumulatedContent += content;
        this.panel.webview.postMessage({
          command: UPDATE_PANEL_CONTENT,
          content: accumulatedContent,
        });
      }
    }
  }

  /**
   * Panel初期化処理
   * @returns
   */
  async togglePanel(): Promise<vscode.WebviewPanel | undefined> {
    const aiService = this.aiServiceFactory.getAiService();
    const isAiServiceAvailable = await aiService.initialize();
    if (!isAiServiceAvailable) {
      vscode.window.showErrorMessage("選択したAIサービスが利用できません");
      return;
    }

    const availableModels = await aiService.getAvailableModels();
    this.reviewModelProvider.setupModels(availableModels);

    // panelが開いている場合は閉じるだけ
    if (this.panel) {
      this.panel.dispose();
      return;
    }

    const newPanel = vscode.window.createWebviewPanel(
      "preview",
      "Preview",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.context.extensionUri, "media"),
        ],
      },
    );

    const markedJsUri = newPanel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "marked.min.js"),
    );
    const prismCssUri = newPanel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "prism.css"),
    );
    const prismJsUri = newPanel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "prism.js"),
    );

    const nonce = getNonce();

    newPanel.webview.html = `<!DOCTYPE html>
<html lang="jp">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${newPanel.webview.cspSource}; img-src ${newPanel.webview.cspSource} https:; script-src 'nonce-${nonce}';">
    <title>Code Review</title>
    <link rel="stylesheet" href="${prismCssUri}">

</head>
<body>
    <script nonce="${nonce}" src="${prismJsUri}"></script>
    <script nonce="${nonce}" src="${markedJsUri}"></script>

    <div id="output"></div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        const output = document.getElementById('output');
        
        window.addEventListener('message', event => {
          const { command, content } = event.data;
          switch (command) {
              case "${UPDATE_PANEL_CONTENT}":
                  output.innerHTML = marked.parse(content);
                  Prism.highlightAll();
                  break;
              case "${CLEAR_PANEL_CONTENT}":
                  output.innerHTML = '';
                  break;
          }
        });
    </script>
</body>
</html>`;

    newPanel.onDidDispose(() => {
      this.panel = undefined;
    });

    this.panel = newPanel;
  }
}
