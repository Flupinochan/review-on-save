/** biome-ignore-all lint/suspicious/noConfusingVoidType: <VSCode公式設定のためvoid戻り値を許可> */

import * as vscode from "vscode";
import { CONFIG_NAME, getConfigurationTarget, SCOPE_SETTING } from "./utils";

/**
 * レビュー対象Item定義
 */
class ReviewTargetItem extends vscode.TreeItem {
  // 表示名
  readonly label: string;
  // 選択状態
  isSelected: boolean;

  constructor(label: string, isSelected = false) {
    super(label, vscode.TreeItemCollapsibleState.None);

    this.label = label;
    this.isSelected = isSelected;
    // VS Code標準のチェックボックスを表示
    this.checkboxState = isSelected
      ? vscode.TreeItemCheckboxState.Checked
      : vscode.TreeItemCheckboxState.Unchecked;
  }
}

/**
 * Provider
 */
export class ReviewScopeProvider
  implements vscode.TreeDataProvider<ReviewTargetItem>
{
  private readonly reviewTargets: ReviewTargetItem[] = [];

  constructor() {
    this.reviewTargets = this.loadFromConfiguration();
  }

  /**
   * 初期化処理
   * @param context
   */
  initialize(context: vscode.ExtensionContext): void {
    // view container作成
    const treeView = vscode.window.createTreeView("review-scope", {
      treeDataProvider: this,
      canSelectMany: true,
      showCollapseAll: false,
    });

    // checkbox選択イベントリスナー設定
    treeView.onDidChangeCheckboxState((e) => {
      for (const [item, checkboxState] of e.items) {
        const target = this.reviewTargets.find((t) => t.label === item.label);
        if (target) {
          target.isSelected =
            checkboxState === vscode.TreeItemCheckboxState.Checked;
        }
      }
    });

    // 削除コマンドの登録
    const deleteCommand = vscode.commands.registerCommand(
      "delete.scope",
      (item: ReviewTargetItem) => {
        this.deleteItem(item);
      },
    );

    // 追加コマンドの登録
    const addCommand = vscode.commands.registerCommand(
      "add.scope",
      async () => {
        await this.addItem();
      },
    );

    context.subscriptions.push(treeView, deleteCommand, addCommand);
  }

  private readonly _onDidChangeTreeData: vscode.EventEmitter<
    ReviewTargetItem | undefined | null | void
  > = new vscode.EventEmitter<ReviewTargetItem | undefined | null | void>();

  readonly onDidChangeTreeData: vscode.Event<
    ReviewTargetItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
    this.saveToConfiguration();
  }

  getTreeItem(element: ReviewTargetItem): vscode.TreeItem {
    return element;
  }

  getChildren(): Thenable<ReviewTargetItem[]> {
    return Promise.resolve(this.reviewTargets);
  }

  getCheckedItems(): ReviewTargetItem[] {
    return this.reviewTargets.filter((item) => item.isSelected);
  }

  /**
   * 設定ファイルからのScopeの読み込み
   */
  private loadFromConfiguration(): ReviewTargetItem[] {
    const config = vscode.workspace.getConfiguration(CONFIG_NAME);
    const savedTargets = config.get<string[]>(SCOPE_SETTING, []);
    const reviewTargets = savedTargets.map(
      (label) => new ReviewTargetItem(label),
    );
    return reviewTargets;
  }

  /**
   * 設定ファイルにScopeを保存
   */
  private saveToConfiguration(): void {
    const config = vscode.workspace.getConfiguration(CONFIG_NAME);
    const targetLabels = this.reviewTargets.map((item) => item.label);
    const target = getConfigurationTarget();
    config.update(SCOPE_SETTING, targetLabels, target);
  }

  /**
   * Scopeの削除
   * @param item
   */
  private deleteItem(item: ReviewTargetItem): void {
    const index = this.reviewTargets.findIndex(
      (target) => target.label === item.label,
    );
    if (index !== -1) {
      this.reviewTargets.splice(index, 1);
      this.refresh();
      vscode.window.showInformationMessage(`${item.label} を削除しました`);
    }
  }

  /**
   * Scopeの追加
   */
  private async addItem(): Promise<void> {
    const itemName = await vscode.window.showInputBox({
      prompt: "追加する項目名を入力してください",
      placeHolder: "例: セキュリティチェック",
      validateInput: (value) => {
        if (!value?.trim()) {
          return "項目名を入力してください";
        }

        if (this.reviewTargets.some((item) => item.label === value.trim())) {
          return "すでに存在する項目名です";
        }

        return null;
      },
    });

    if (itemName?.trim()) {
      const trimmedName = itemName.trim();
      const newItem = new ReviewTargetItem(trimmedName);
      this.reviewTargets.push(newItem);
      this.refresh();
      vscode.window.showInformationMessage(`${trimmedName} を追加しました`);
    }
  }
}
