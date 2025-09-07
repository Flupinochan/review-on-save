/** biome-ignore-all lint/suspicious/noConfusingVoidType: <VSCode公式設定のためvoid戻り値を許可> */
import * as vscode from "vscode";
import type {
  AiServiceFactory,
  AiServiceType,
} from "../ai-service/ai-service-factory";
import { CONFIG_NAME, getConfigurationTarget, SERVICE_SETTING } from "../utils";
import type { ReviewModelProvider } from "./review-model-provider";

export class ReviewServiceProvider
  implements vscode.TreeDataProvider<AiServiceType>
{
  private selected: AiServiceType = "copilot";
  private services: AiServiceType[] = ["copilot", "ollama"];
  private readonly aiServiceFactory: AiServiceFactory;
  private readonly reviewModelProvider: ReviewModelProvider;

  constructor(
    aiServiceFactory: AiServiceFactory,
    reviewModelProvider: ReviewModelProvider,
  ) {
    this.aiServiceFactory = aiServiceFactory;
    this.reviewModelProvider = reviewModelProvider;

    const config = vscode.workspace.getConfiguration(CONFIG_NAME);
    const defaultService = config.get<AiServiceType>(
      SERVICE_SETTING,
      "copilot",
    );
    if (defaultService) {
      this.selected = defaultService;
    }
  }

  private readonly _onDidChangeTreeData: vscode.EventEmitter<
    AiServiceType | undefined | null | void
  > = new vscode.EventEmitter<AiServiceType | undefined | null | void>();

  readonly onDidChangeTreeData: vscode.Event<
    AiServiceType | undefined | null | void
  > = this._onDidChangeTreeData.event;

  getSelectedService(): AiServiceType {
    return this.selected;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: AiServiceType): vscode.TreeItem {
    const item = new vscode.TreeItem(element);
    item.iconPath = new vscode.ThemeIcon(
      element === this.selected ? "circle-filled" : "circle-outline",
    );
    item.command = {
      title: "Select Service",
      command: "service.select",
      arguments: [element],
    };
    return item;
  }

  getChildren(): Thenable<AiServiceType[]> {
    return Promise.resolve(this.services);
  }

  async selectService(service: AiServiceType): Promise<void> {
    this.selected = service;
    const config = vscode.workspace.getConfiguration(CONFIG_NAME);
    const target = getConfigurationTarget();
    config.update(SERVICE_SETTING, service, target);

    // 選択したサービスに合わせてAiServiceを切り替え
    this.aiServiceFactory.switchAiService(this.selected);
    const aiService = this.aiServiceFactory.getAiService();
    const models = await aiService.getAvailableModels();

    // 選択したサービスに合わせてModel一覧を更新
    this.reviewModelProvider.setupModels(models);

    this.refresh();
  }

  setupServices(services: AiServiceType[]) {
    this.services = services;
    if (this.services.length > 0) {
      this.selected = this.services[0];
    }
    this.refresh();
  }

  initialize(context: vscode.ExtensionContext) {
    // view container作成
    const treeView = vscode.window.createTreeView("review-service", {
      treeDataProvider: this,
      canSelectMany: false,
      showCollapseAll: false,
    });

    // radio button設定
    const radioCommand = vscode.commands.registerCommand(
      "service.select",
      async (service: AiServiceType) => {
        await this.selectService(service);
      },
    );

    context.subscriptions.push(treeView, radioCommand);
  }
}
