import * as vscode from "vscode";
import type { ReviewScopeProvider } from "./review-scope-provider";

type ProviderId = "github" | "microsoft";

export class CopilotService {
  private readonly reviewScopeProvider: ReviewScopeProvider;
  private readonly providerId: ProviderId;
  private isProcessing = false;

  constructor(reviewScopeProvider: ReviewScopeProvider) {
    this.reviewScopeProvider = reviewScopeProvider;
    this.providerId = "github";
  }

  /**
   * Copilotが利用可能かどうかをチェック
   * @returns
   */
  async initialize(): Promise<boolean> {
    const isExtentionActive = await this.checkCopilotExtension();
    if (!isExtentionActive) {
      return false;
    }

    const isAuthenticated = await this.checkCopilotAuth();
    if (!isAuthenticated) {
      return false;
    }

    const availableModels = await this.getAvailableModelIds();
    if (availableModels.length === 0) {
      return false;
    }

    return true;
  }

  /**
   * 利用可能なLanguage Modelを取得
   * @returns
   */
  async getAvailableModelIds(): Promise<string[]> {
    const availableModels = await vscode.lm.selectChatModels();
    if (availableModels.length === 0) {
      vscode.window.showErrorMessage(
        "利用可能なLanguage Modelが見つかりませんでした",
      );
      return [];
    }
    return availableModels.map((model) => model.id);
  }

  /**
   * GitHub認証チェック
   * 認証されていない場合は認証ダイアログが表示され、認証エラー時はエラーがスローされる
   * @returns
   */
  async checkCopilotAuth(): Promise<boolean> {
    try {
      await vscode.authentication.getSession(this.providerId, [], {
        createIfNone: true,
      });
      return true;
    } catch (error) {
      vscode.window.showErrorMessage(`認証に失敗しました: ${error}`);
      return false;
    }
  }

  /**
   * Language Model APIの利用にはCopilot拡張機能が必要
   * @returns
   */
  async checkCopilotExtension(): Promise<boolean> {
    const extensionId = "github.copilot";
    const extension = vscode.extensions.getExtension(extensionId);

    if (!extension) {
      vscode.window.showErrorMessage(
        "GitHub Copilot拡張機能がインストールされていません。インストールをしてください",
      );
      await vscode.commands.executeCommand("extension.open", extensionId);
      return false;
    }

    return true;
  }

  /**
   * Copilotでチャットする
   * @param fileContent
   * @returns Streaming Response
   */
  async *chatCopilot(
    fileContent: string,
    model: string,
  ): AsyncGenerator<string, void, unknown> {
    if (this.isProcessing) {
      vscode.window.showWarningMessage("処理中です。しばらくお待ちください。");
      return;
    }

    try {
      // Modelが利用可能かどうかでチャット可能か判断
      const models = await this.getAvailableModelIds();
      if (!models.includes(model)) {
        vscode.window.showErrorMessage(
          `選択された ${model} モデルは利用できません`,
        );
        return;
      }

      vscode.window.showInformationMessage(`${model} モデルとチャット中...`);

      const reviewTargets = this.reviewScopeProvider
        .getCheckedItems()
        .map((item) => item.label);

      const content = `\`\`\`
${fileContent}
\`\`\`

あなたは経験豊富なソフトウェアエンジニアです。
上記コードを${reviewTargets.join("、")}の観点からコードに問題があるかどうかレビューしてください。
観点以外について問題があったとしてもレビューは不要で余計な回答はさけてください。
必要に応じてコード修正例を出力してください。
回答が冗長にならないように気を付けてください。
問題がある場合は500文字以内で回答し、問題がなければ1行で回答してください。
日本語で回答してください。`;

      this.isProcessing = true;
      const prompt = [vscode.LanguageModelChatMessage.User(content)];
      const modelObject = await this.getModelById(model);
      if (!modelObject) {
        vscode.window.showErrorMessage(
          `選択された ${model} モデルは利用できません`,
        );
        return;
      }
      const response = await modelObject.sendRequest(prompt, {});

      for await (const chunk of response.stream) {
        if (chunk instanceof vscode.LanguageModelTextPart) {
          yield chunk.value;
        }
      }
      vscode.window.showInformationMessage("Copilotとのチャットが完了しました");
    } catch (error) {
      vscode.window.showErrorMessage(`エラーが発生しました: ${error}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * ModelIdからモデル情報を取得
   * Ollamaと違い、CopilotはModelObjectが必要
   * @param modelId
   * @returns
   */
  async getModelById(
    modelId: string,
  ): Promise<vscode.LanguageModelChat | null> {
    const allModels = await vscode.lm.selectChatModels();
    const targetModel = allModels.find((model) => model.id === modelId);
    return targetModel || null;
  }
}
