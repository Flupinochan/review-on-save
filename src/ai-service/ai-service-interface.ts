export interface AiServiceInterface {
  // 初期化処理、対象AIサービスが利用可能かどうかチェック
  initialize(): Promise<boolean>;
  // 利用可能なモデルの取得、view containerに表示
  getAvailableModels(): Promise<string[]>;
  // チャットしてレスポンスをストリームで受け取る
  chat(
    fileContent: string,
    model: string,
  ): AsyncGenerator<string, void, unknown>;
}
