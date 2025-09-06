import { exec } from "node:child_process";
import process from "node:process";
import { promisify } from "node:util";
import ollama from "ollama";
import * as vscode from "vscode";
import { CONFIG_NAME } from "./review-model-provider";

const OLLAMA_ENDPOINT = "apiEndpoint";

/**
 * Ollamaに関する機能を定義
 */
export class OllamaService {
  private readonly execAsync = promisify(exec);
  private readonly ollamaEndpoint: string;
  private readonly ollamaDownloadUrl = "https://ollama.com/download";
  private isProcessing = false;

  constructor() {
    // Workspace等のConfigurationの設定取得
    const config = vscode.workspace.getConfiguration(CONFIG_NAME);
    this.ollamaEndpoint = config.get<string>(
      OLLAMA_ENDPOINT,
      "http://localhost:11434",
    );
  }

  /**
   * Ollamaの起動状態を確認
   * @returns
   */
  async checkOllamaStarted(): Promise<boolean> {
    try {
      const response = await fetch(this.ollamaEndpoint);
      if (!response.ok) {
        throw new Error("Ollama is not started");
      }
      return true;
    } catch (error) {
      vscode.window.showErrorMessage(`Ollamaが起動していません\n${error}`);
      return false;
    }
  }

  /**
   * Ollamaのインストール状態を確認
   * @returns
   */
  async checkOllamaInstalled(): Promise<boolean> {
    try {
      const ollamaCommand = "ollama";
      const platform = process.platform;
      const checkCommand =
        platform === "win32"
          ? `where ${ollamaCommand}`
          : `which ${ollamaCommand}`;
      await this.execAsync(checkCommand);
      return true;
    } catch (error) {
      vscode.window.showErrorMessage(
        `Ollamaがインストールされていません\n${error}`,
      );
      return false;
    }
  }

  /**
   * terminalでOllamaを起動
   */
  startOllama(): void {
    const ollamaStartCommand = "ollama serve";
    const terminal = vscode.window.createTerminal("Ollama Server");
    terminal.sendText(ollamaStartCommand);
    terminal.show();
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
      vscode.window.showErrorMessage(
        `Ollamaがインストールされていません\n${this.ollamaDownloadUrl} からOllamaをインストールしてください`,
      );
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
   * Ollamaでチャットする
   * @param fileContent
   * @returns Streaming Response
   */
  async *chatOllama(
    fileContent: string,
    model: string,
  ): AsyncGenerator<string, void, unknown> {
    if (this.isProcessing) {
      return;
    }

    vscode.window.showInformationMessage("Ollamaとチャット中...");

    this.isProcessing = true;
    const response = await ollama.chat({
      model,
      messages: [
        {
          role: "system",
          content: "Please respond in Markdown format",
        },
        {
          role: "user",
          content: `${fileContent}について日本語でコードレビューをお願いいたします`,
        },
      ],
      stream: true,
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
  }

  /**
   * Ollamaで利用可能な生成AI Modelを取得
   * @returns
   */
  async getAvailableModels(): Promise<string[]> {
    const response = await ollama.list();
    return response.models.map((model) => model.name);
  }
}
