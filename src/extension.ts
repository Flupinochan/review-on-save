import type * as vscode from "vscode";
import { OllamaService } from "./ollama-service";
import { PanelService } from "./panel-service";
import { ReviewModelProvider } from "./review-model-provider";

/**
 * 拡張機能アクティベート時初期化処理
 * エントリーポイント
 * @param context
 */
export function activate(context: vscode.ExtensionContext): void {
  // Ollama
  const ollamaService = new OllamaService();

  // Model View Container
  const reviewModelProvider = new ReviewModelProvider();
  reviewModelProvider.initialize(context);

  // Panel(Web View)
  const panelService = new PanelService(
    context,
    ollamaService,
    reviewModelProvider,
  );
  panelService.initialize();
}

export function deactivate(): void {
  return;
}
