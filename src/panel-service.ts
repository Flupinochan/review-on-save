import * as vscode from "vscode";

/**
 * HTML (WebView) にJavaScriptの挿入を安全にするため
 * @returns
 */
function getNonce(): string {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export function setupPanel(
  existingPanel: vscode.WebviewPanel | undefined,
  context: vscode.ExtensionContext,
  onDispose: () => void,
): vscode.WebviewPanel | undefined {
  if (existingPanel) {
    existingPanel.dispose();
    return;
  }

  const newPanel = vscode.window.createWebviewPanel(
    "preview",
    "Preview",
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "media")],
    },
  );

  const markedJsUri = newPanel.webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "media", "marked.min.js"),
  );
  const prismCssUri = newPanel.webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "media", "prism.css"),
  );
  const prismJsUri = newPanel.webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "media", "prism.js"),
  );
  const nonce = getNonce();

  newPanel.webview.html = `<!DOCTYPE html>
<html lang="jp">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${newPanel.webview.cspSource}; img-src ${newPanel.webview.cspSource} https:; script-src 'nonce-${nonce}';">
    <title>Cat Coding</title>
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
              case 'updateContent':
                  output.innerHTML = marked.parse(content);
                  Prism.highlightAll();
                  break;
              case 'clearContent':
                  output.innerHTML = '';
                  break;
          }
        });
    </script>
</body>
</html>`;

  newPanel.onDidDispose(() => {
    onDispose();
  });

  return newPanel;
}
