import * as vscode from "vscode";
import type { ReviewScopeProvider } from "../view-container/review-scope-provider";
import { CONFIG_NAME, DEFAULT_SERVICE_TYPE } from "./../utils";
import type { AiServiceInterface } from "./ai-service-interface";
import { CopilotService } from "./copilot-service";
import { OllamaService } from "./ollama-service";

// package.jsonとの互換性のためEnumではなくUnion Typeで定義
export type AiServiceType = "copilot" | "ollama";

export class AiServiceFactory {
  private readonly reviewScopeProvider: ReviewScopeProvider;
  private aiService: AiServiceInterface;

  constructor(reviewScopeProvider: ReviewScopeProvider) {
    const config = vscode.workspace.getConfiguration(CONFIG_NAME);
    const serviceType = config.get<AiServiceType>(
      DEFAULT_SERVICE_TYPE,
      "copilot",
    );

    this.reviewScopeProvider = reviewScopeProvider;
    this.aiService = this.createAiService(serviceType);
  }

  getAiService(): AiServiceInterface {
    return this.aiService;
  }

  switchAiService(serviceType: AiServiceType): void {
    this.aiService = this.createAiService(serviceType);
  }

  createAiService(serviceType: AiServiceType): AiServiceInterface {
    switch (serviceType) {
      case "copilot":
        return new CopilotService(this.reviewScopeProvider);
      case "ollama":
        return new OllamaService(this.reviewScopeProvider);
      default:
        throw new Error(`未対応のサービスタイプです: ${serviceType}`);
    }
  }
}
