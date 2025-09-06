import * as vscode from "vscode";

export class ReviewScopeProvider implements vscode.TreeDataProvider<string> {
  private items = ["TypeScript", "JavaScript", "Python"];

  getTreeItem(element: string): vscode.TreeItem {
    const item = new vscode.TreeItem(element);
    item.checkboxState = vscode.TreeItemCheckboxState.Unchecked;
    return item;
  }

  getChildren(): string[] {
    return this.items;
  }
}
