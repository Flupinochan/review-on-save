import * as vscode from "vscode";
import type { ReviewScopeProvider } from "../view-container/review-scope-provider";
import { CONFIG_NAME, getConfigurationTarget } from "./../utils";
import type { AiServiceInterface } from "./ai-service-interface";
import { CopilotService } from "./copilot-service";
import { OllamaService } from "./ollama-service";

/**
 * 現在の設定からサービスタイプを取得
 */
function getCurrentAiServiceType(): AiServiceType {
  const config = vscode.workspace.getConfiguration(CONFIG_NAME);
  return config.get<AiServiceType>("aiServiceType", "copilot");
}

/**
 * サービスタイプを設定に保存
 */
function setCurrentAiServiceType(serviceType: AiServiceType): void {
  const config = vscode.workspace.getConfiguration(CONFIG_NAME);
  config.update("aiServiceType", serviceType, getConfigurationTarget());
}

export type AiServiceType = "copilot" | "ollama";

/**
 * 設定から読み取ったサービスタイプでAIサービスを作成（初期化用）
 */
export function createAiServiceFromConfig(
  reviewScopeProvider: ReviewScopeProvider,
): AiServiceInterface {
  const serviceType = getCurrentAiServiceType();
  return createAiServiceWithType(serviceType, reviewScopeProvider);
}

/**
 * サービスタイプを設定に保存し、新しいサービスインスタンスを作成して返す
 */
export function switchAiService(
  serviceType: AiServiceType,
  reviewScopeProvider: ReviewScopeProvider,
): AiServiceInterface {
  setCurrentAiServiceType(serviceType);
  return createAiServiceWithType(serviceType, reviewScopeProvider);
}

/**
 * 指定されたサービスタイプでAIサービスを作成し、設定も更新
 */
export function createAiServiceWithType(
  serviceType: AiServiceType,
  reviewScopeProvider: ReviewScopeProvider,
): AiServiceInterface {
  switch (serviceType) {
    case "copilot":
      return new CopilotService(reviewScopeProvider);
    case "ollama":
      return new OllamaService(reviewScopeProvider);
    default:
      throw new Error(`未対応のサービスタイプです: ${serviceType}`);
  }
}
