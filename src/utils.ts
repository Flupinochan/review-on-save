// Static Method定義ファイル

import * as vscode from "vscode";

export const CONFIG_NAME = "reviewOnSave";
export const MODEL_SETTING = "model";
export const SCOPE_SETTING = "reviewTargets";

/**
 * HTML (WebView) にJavaScriptの挿入を安全にするため
 * @returns
 */
export function getNonce(): string {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/**
 * 設定保存場所を取得
 * デフォルトでGlobal
 * @returns
 */
export function getConfigurationTarget(): vscode.ConfigurationTarget {
  const config = vscode.workspace.getConfiguration(CONFIG_NAME);
  const inspection = config.inspect<string>(MODEL_SETTING);

  if (inspection) {
    if (inspection.workspaceValue !== undefined) {
      return vscode.ConfigurationTarget.Workspace;
    }

    if (inspection.workspaceFolderValue !== undefined) {
      return vscode.ConfigurationTarget.WorkspaceFolder;
    }

    return vscode.ConfigurationTarget.Global;
  }

  return vscode.ConfigurationTarget.Global;
}
