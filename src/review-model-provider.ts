/** biome-ignore-all lint/suspicious/noConfusingVoidType: <VSCode公式設定のためvoid戻り値を許可> */
import * as vscode from "vscode";

export const CONFIG_NAME = "reviewOnSave";
export const MODEL_SETTING = "model";

export class ReviewModelProvider implements vscode.TreeDataProvider<string> {
  private selected = "";
  private readonly models: string[];

  constructor(models: string[]) {
    this.models = models;

    const config = vscode.workspace.getConfiguration(CONFIG_NAME);
    const defaultModel = config.get<string>(MODEL_SETTING, "");

    if (defaultModel !== "") {
      this.selected = defaultModel;
    } else if (this.models.length > 0) {
      this.selected = this.models[0];
    }
  }

  private readonly _onDidChangeTreeData: vscode.EventEmitter<
    string | undefined | null | void
  > = new vscode.EventEmitter<string | undefined | null | void>();

  readonly onDidChangeTreeData: vscode.Event<string | undefined | null | void> =
    this._onDidChangeTreeData.event;

  /**
   * 選択中のModel名を返却
   * @returns
   */
  getSelectedModel(): string {
    return this.selected;
  }

  /**
   * UI再レンダリング
   * 全ItemのgetTreeItem()を実行
   */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Itemごとの表示・動作を設定
   * @param element
   * @returns
   */
  getTreeItem(element: string): vscode.TreeItem {
    const item = new vscode.TreeItem(element);
    item.iconPath = new vscode.ThemeIcon(
      element === this.selected ? "circle-filled" : "circle-outline",
    );
    item.command = {
      title: "Select Model",
      command: "radio.select",
      arguments: [element],
    };
    return item;
  }

  /**
   * List
   * @returns
   */
  getChildren(): Thenable<string[]> {
    return Promise.resolve(this.models);
  }

  /**
   * "command": "radio.select" で呼び出されるRadioButton選択時の処理
   * @param model
   */
  selectModel(model: string): void {
    this.selected = model;
    const config = vscode.workspace.getConfiguration(CONFIG_NAME);
    const target = this.getConfigurationTarget();
    config.update(MODEL_SETTING, model, target);
    this.refresh();
  }

  /**
   * 設定保存場所を判定
   * デフォルトでGlobal
   * @returns
   */
  private getConfigurationTarget(): vscode.ConfigurationTarget {
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
}
