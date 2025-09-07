import { exec } from "node:child_process";
import process from "node:process";
import { promisify } from "node:util";
import ollama from "ollama";
import * as vscode from "vscode";
import { CONFIG_NAME } from "../utils";
import type { ReviewScopeProvider } from "../view-container/review-scope-provider";
import type { AiServiceInterface } from "./ai-service-interface";

const OLLAMA_ENDPOINT = "apiEndpoint";

/**
 * Ollamaに関する機能を定義
 */
export class OllamaService implements AiServiceInterface {
  private readonly reviewScopeProvider: ReviewScopeProvider;
  private readonly execAsync = promisify(exec);
  private readonly ollamaEndpoint: string;
  private readonly ollamaDownloadUrl = "https://ollama.com/download";
  private isProcessing = false;

  constructor(reviewScopeProvider: ReviewScopeProvider) {
    this.reviewScopeProvider = reviewScopeProvider;

    // Workspace等のConfigurationの設定取得
    const config = vscode.workspace.getConfiguration(CONFIG_NAME);
    this.ollamaEndpoint = config.get<string>(
      OLLAMA_ENDPOINT,
      "http://localhost:11434",
    );
  }

  /**
   * 初期化処理 (Ollamaを利用可能状態にする)
   * @returns
   */
  async initialize(): Promise<boolean> {
    const isOllamaStarted = await this.checkOllamaStarted();
    if (isOllamaStarted) {
      vscode.window.showInformationMessage("Ollamaが起動済みです");
      return true;
    }

    const isOllamaInstalled = await this.checkOllamaInstalled();
    if (!isOllamaInstalled) {
      return false;
    }

    vscode.window.showInformationMessage("Ollamaを起動中...");
    this.startOllama();

    return new Promise((resolve) => {
      setTimeout(async () => {
        const isOllamaActive = await this.checkOllamaStarted();
        if (isOllamaActive) {
          vscode.window.showInformationMessage("Ollamaの起動に成功しました");
          resolve(true);
        } else {
          vscode.window.showErrorMessage("Ollamaの起動に失敗しました");
          resolve(false);
        }
      }, 5000);
    });
  }

  /**
   * Ollamaで利用可能な生成AI Modelを取得
   * @returns
   */
  async getAvailableModels(): Promise<string[]> {
    const response = await ollama.list();
    return response.models.map((model) => model.name).sort();
  }

  /**
   * Ollamaでチャットする
   * @param fileContent
   * @returns Streaming Response
   */
  async *chat(
    fileContent: string,
    model: string,
  ): AsyncGenerator<string, void, unknown> {
    if (this.isProcessing) {
      vscode.window.showWarningMessage("処理中です。しばらくお待ちください。");
      return;
    }

    try {
      // Modelが利用可能かどうかでチャット可能か判断
      const models = await this.getAvailableModels();
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
      const response = await ollama.chat({
        model,
        messages: [
          {
            role: "system",
            content: "Please output in Markdown format",
          },
          {
            role: "user",
            content,
          },
        ],
        stream: true,
        // biome-ignore lint/style/useNamingConvention: <Ollama仕様のため>
        keep_alive: 0,
      });

      for await (const part of response) {
        if (part.done) {
          this.isProcessing = false;
          vscode.window.showInformationMessage(
            "Ollamaとのチャットが完了しました",
          );
          return;
        }
        yield part.message.content;
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Ollamaの起動状態を確認
   * @returns
   */
  private async checkOllamaStarted(): Promise<boolean> {
    try {
      const response = await fetch(this.ollamaEndpoint);
      if (!response.ok) {
        throw new Error("Ollama is not started");
      }
      return true;
    } catch (_error) {
      vscode.window.showErrorMessage("Ollamaが起動していません");
      return false;
    }
  }

  /**
   * Ollamaのインストール状態を確認
   * @returns
   */
  private async checkOllamaInstalled(): Promise<boolean> {
    try {
      const ollamaCommand = "ollama";
      const platform = process.platform;
      const checkCommand =
        platform === "win32"
          ? `where ${ollamaCommand}`
          : `which ${ollamaCommand}`;
      await this.execAsync(checkCommand);
      return true;
    } catch (_error) {
      vscode.window.showErrorMessage("Ollamaがインストールされていません");
      vscode.window.showErrorMessage(
        `${this.ollamaDownloadUrl} からOllamaをインストールしてください`,
      );
      return false;
    }
  }

  /**
   * terminalでOllamaを起動
   */
  private startOllama(): void {
    const ollamaStartCommand = "ollama serve";
    const terminal = vscode.window.createTerminal("Ollama Server");
    terminal.sendText(ollamaStartCommand);
    terminal.show();
  }
}
