/** biome-ignore-all lint/suspicious/noConfusingVoidType: <VSCode公式設定のためvoid戻り値を許可> */
import * as vscode from "vscode";
import {
  CONFIG_NAME,
  DEFAULT_MODEL,
  getConfigurationTarget,
  MODES_VIEW_ID,
  SELECT_MODEL_COMMAND,
} from "../utils";

/**
 * Ollamaで扱うModelを選択するView Container設定クラス
 */
export class ReviewModelProvider implements vscode.TreeDataProvider<string> {
  private selected = "";
  private models: string[] = [];

  constructor() {
    const config = vscode.workspace.getConfiguration(CONFIG_NAME);
    const defaultModel = config.get<string>(DEFAULT_MODEL, "");
    if (defaultModel !== "") {
      this.selected = defaultModel;
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
   * Item (Model) ごとの表示・動作を設定
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
      command: SELECT_MODEL_COMMAND,
      arguments: [element],
    };
    return item;
  }

  /**
   *
   * @returns
   */
  getChildren(): Thenable<string[]> {
    return Promise.resolve(this.models);
  }

  /**
   * "command": "select.model" で呼び出されるRadioButton選択時の処理
   * @param model
   */
  selectModel(model: string): void {
    this.selected = model;
    const config = vscode.workspace.getConfiguration(CONFIG_NAME);
    const target = getConfigurationTarget();
    config.update(DEFAULT_MODEL, model, target);
    this.refresh();
  }

  /**
   * models setter
   * @param models
   */
  setupModels(models: string[]) {
    this.models = models;
    if (this.selected === "" && this.models.length > 0) {
      this.selected = this.models[0];
    }
    this.refresh();
  }

  /**
   * 初期化処理
   * @param context
   */
  initialize(context: vscode.ExtensionContext) {
    // view container作成
    const treeView = vscode.window.createTreeView(MODES_VIEW_ID, {
      treeDataProvider: this,
      canSelectMany: false,
      showCollapseAll: false,
    });

    // radio button設定
    const radioCommand = vscode.commands.registerCommand(
      SELECT_MODEL_COMMAND,
      (model: string) => {
        this.selectModel(model);
      },
    );

    context.subscriptions.push(treeView, radioCommand);
  }
}
