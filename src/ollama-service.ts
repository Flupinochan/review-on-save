import { exec } from "node:child_process";
import process from "node:process";
import { promisify } from "node:util";
import ollama from "ollama";
import * as vscode from "vscode";

const EXEC_ASYNC = promisify(exec);
const OLLAMA_ENDPOINT = "http://localhost:11434";
const OLLAMA_DOWNLOAD_URL = "https://ollama.com/download";
let IsProcessing = false;

/**
 * Ollamaの起動状態を確認
 * @returns
 */
async function checkOllamaStarted(): Promise<boolean> {
  try {
    const response = await fetch(OLLAMA_ENDPOINT);
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
async function checkOllamaInstalled(): Promise<boolean> {
  try {
    const ollamaCommand = "ollama";
    const platform = process.platform;
    const checkCommand =
      platform === "win32"
        ? `where ${ollamaCommand}`
        : `which ${ollamaCommand}`;
    await EXEC_ASYNC(checkCommand);
    return true;
  } catch (_error) {
    vscode.window.showErrorMessage("Ollamaがインストールされていません");
    return false;
  }
}

/**
 * terminalでOllamaを起動
 */
function startOllama(): void {
  const ollamaStartCommand = "ollama serve";
  const terminal = vscode.window.createTerminal("Ollama Server");
  terminal.sendText(ollamaStartCommand);
  terminal.show();
}

/**
 * useCase: Ollamaを利用可能状態にする
 * @returns
 */
export async function setupOllama(): Promise<boolean> {
  const isOllamaStarted = await checkOllamaStarted();
  if (isOllamaStarted) {
    vscode.window.showInformationMessage("Ollamaが起動済みです");
    return true;
  }

  const isOllamaInstalled = await checkOllamaInstalled();
  if (!isOllamaInstalled) {
    vscode.window.showErrorMessage(
      `Ollamaがインストールされていません\n${OLLAMA_DOWNLOAD_URL} からOllamaをインストールしてください`,
    );
    return false;
  }

  vscode.window.showInformationMessage("Ollamaを起動中...");
  await startOllama();

  return new Promise((resolve) => {
    setTimeout(async () => {
      const isOllamaActive = await checkOllamaStarted();
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
export async function* chatOllama(
  fileContent: string,
): AsyncGenerator<string, void, unknown> {
  if (IsProcessing) {
    return;
  }

  vscode.window.showInformationMessage("Ollamaとチャット中...");

  IsProcessing = true;
  const response = await ollama.chat({
    model: "gemma3:latest",
    messages: [
      {
        role: "user",
        content: `${fileContent}について日本語でコードレビューをお願いいたします`,
      },
    ],
    stream: true,
  });

  for await (const part of response) {
    if (part.done) {
      IsProcessing = false;
      vscode.window.showInformationMessage("Ollamaとのチャットが完了しました");
      return;
    }
    yield part.message.content;
  }
}
