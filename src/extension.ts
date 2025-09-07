import type * as vscode from "vscode";
import { CopilotService } from "./copilot-service";
import { OllamaService } from "./ollama-service";
import { PanelService } from "./panel-service";
import { ReviewModelProvider } from "./review-model-provider";
import { ReviewScopeProvider } from "./review-scope-provider";

/**
 * 拡張機能アクティベート時初期化処理
 * エントリーポイント
 * @param context
 */
export function activate(context: vscode.ExtensionContext): void {
  // Model View Container
  const reviewModelProvider = new ReviewModelProvider();
  reviewModelProvider.initialize(context);

  // Scope View Container
  const reviewScopeProvider = new ReviewScopeProvider();
  reviewScopeProvider.initialize(context);

  // Ollama
  const ollamaService = new OllamaService(reviewScopeProvider);

  // Copilot
  const copilotService = new CopilotService(reviewScopeProvider);

  // Panel(Web View)
  const panelService = new PanelService(
    context,
    ollamaService,
    copilotService,
    reviewModelProvider,
  );
  panelService.initialize();
}

export function deactivate(): void {
  return;
}
