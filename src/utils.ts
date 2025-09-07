import * as vscode from "vscode";

/**
 * package.jsonのcontributes.configurationのkeyと合わせる
 * package.jsonからの設定値取得用
 */
export const CONFIG_NAME = "reviewOnSave";
export const DEFAULT_MODEL = "model";
export const DEFAULT_SCOPES = "scopes";
export const DEFAULT_SERVICE_TYPE = "aiServiceType";
export const OLLAMA_ENDPOINT = "ollamaEndpoint";

// contributes.viewsのidと合わせる
export const MODES_VIEW_ID = "models-view";
export const SCOPES_VIEW_ID = "scopes-view";
export const SERVICES_VIEW_ID = "services-view";

// contributes.commandsのcommandと合わせる
export const SELECT_MODEL_COMMAND = "select.model";
export const SELECT_SERVICE_COMMAND = "select.service";
export const PREVIEW_COMMAND = "preview.panel";
export const ADD_SCOPE_COMMAND = "add.scope";
export const DELETE_SCOPE_COMMAND = "delete.scope";

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
  const inspection = config.inspect<string>(DEFAULT_MODEL);

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
