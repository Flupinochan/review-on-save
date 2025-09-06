import type * as vscode from "vscode";
import { OllamaService } from "./ollama-service";
import { PanelService } from "./panel-service";
import { ReviewModelProvider } from "./review-model-provider";

/**
 * 拡張機能アクティベート時初期化処理
 * エントリーポイント
 * @param context
 */
export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  // Ollama初期化
  const ollamaService = new OllamaService();
  await ollamaService.initialize();
  const models = await ollamaService.getAvailableModels();

  // Model View Container初期化
  const reviewModelProvider = new ReviewModelProvider(models);
  reviewModelProvider.initialize(context);

  // Panel(Web View)初期化
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
