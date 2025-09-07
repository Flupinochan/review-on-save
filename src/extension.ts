import type * as vscode from "vscode";
import { AiServiceFactory } from "./ai-service/ai-service-factory";
import { PanelService } from "./panel-service";
import { ReviewModelProvider } from "./view-container/review-model-provider";
import { ReviewScopeProvider } from "./view-container/review-scope-provider";
import { ReviewServiceProvider } from "./view-container/review-service-provider";

/**
 * 拡張機能アクティベート時初期化処理
 * エントリーポイント
 * @param context
 */
export function activate(context: vscode.ExtensionContext): void {
  // Scope View Container
  const reviewScopeProvider = new ReviewScopeProvider();
  reviewScopeProvider.initialize(context);

  // Model View Container
  const reviewModelProvider = new ReviewModelProvider();
  reviewModelProvider.initialize(context);

  // AI Service
  const aiServiceFactory = new AiServiceFactory(reviewScopeProvider);

  // AI Service View Container
  const reviewServiceProvider = new ReviewServiceProvider(
    aiServiceFactory,
    reviewModelProvider,
  );
  reviewServiceProvider.initialize(context);

  // Panel (Web View)
  const panelService = new PanelService(
    context,
    aiServiceFactory.getAiService(),
    reviewModelProvider,
  );
  panelService.initialize();
}

export function deactivate(): void {
  return;
}
