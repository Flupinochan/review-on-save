/** biome-ignore-all lint/suspicious/noConfusingVoidType: <VSCode公式設定のためvoid戻り値を許可> */

import * as vscode from "vscode";

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
  private readonly reviewTargets: ReviewTargetItem[] = [
    new ReviewTargetItem("命名規則"),
    new ReviewTargetItem("コメントアウト"),
    new ReviewTargetItem("例外処理"),
    new ReviewTargetItem("重複コード"),
    new ReviewTargetItem("マジックナンバー"),
    new ReviewTargetItem("デザインパターン"),
  ];

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

    context.subscriptions.push(treeView);
  }

  private readonly _onDidChangeTreeData: vscode.EventEmitter<
    ReviewTargetItem | undefined | null | void
  > = new vscode.EventEmitter<ReviewTargetItem | undefined | null | void>();

  readonly onDidChangeTreeData: vscode.Event<
    ReviewTargetItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
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
}
