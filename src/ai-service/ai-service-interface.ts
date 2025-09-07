export interface AiServiceInterface {
  // 初期化処理、利用可能かどうかのチェック
  initialize(): Promise<boolean>;
  // 利用可能なモデルの取得、view containerに表示
  getAvailableModels(): Promise<string[]>;
  // チャットしてレスポンスをストリームで受け取る
  chat(
    fileContent: string,
    model: string,
  ): AsyncGenerator<string, void, unknown>;
}
