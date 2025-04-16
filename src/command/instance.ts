import { ConsulOptions } from "consul/lib/consul";
import { ConsulInstanceTreeItem, ConsulProvider, KVTreeItem } from "../providers/consulProvider";
import { ConsulTreeDataProvider } from "../providers/treeDataProvider";
import vscode from 'vscode';
import Consul from "consul";



function getConfigWebviewContent(label: string, config: any, toolkitUri: vscode.Uri) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script type="module" src="${toolkitUri}"></script>
            <style>
                body {
                    padding: 20px;
                    color: var(--vscode-foreground);
                    font-family: var(--vscode-font-family);
                    background-color: var(--vscode-editor-background);
                }
                .form-group {
                    margin-bottom: 20px;
                }
                vscode-text-field {
                    width: 100%;
                    margin-top: 5px;
                }
                .button-container {
                    display: flex;
                    gap: 10px;
                    margin-top: 30px;
                }
                vscode-button {
                    margin-right: 10px;
                }
            </style>
        </head>
        <body>
            <vscode-panels>
                <vscode-panel-tab id="tab-1">Connection</vscode-panel-tab>
                <vscode-panel-view id="view-1">
                    <form id="configForm">
                        <div class="form-group">
                            <vscode-text-field
                                id="host"
                                value="${config.host || ''}"
                                placeholder="localhost">
                                Host
                            </vscode-text-field>
                        </div>
                        <div class="form-group">
                            <vscode-text-field
                                id="port"
                                type="number"
                                value="${config.port || '8500'}"
                                placeholder="8500">
                                Port
                            </vscode-text-field>
                        </div>
                        <div class="form-group">
                            <vscode-text-field
                                type="password"
                                id="token"
                                value="${config.defaults?.token || ''}"
                                placeholder="Optional">
                                Token
                            </vscode-text-field>
                        </div>
                        <div class="form-group">
                            <label style="display: flex; align-items: center; gap: 8px;">
                                <input
                                    type="checkbox"
                                    id="secure"
                                    ${config.secure ? 'checked' : ''}
                                    style="margin: 0;"
                                >
                                <span>Use HTTPS</span>
                            </label>
                        </div>
                        <div class="button-container">
                            <vscode-button appearance="primary" onclick="testConnection()">
                                Test Connection
                            </vscode-button>
                            <vscode-button appearance="secondary" onclick="saveConfig()">
                                Save
                            </vscode-button>
                            <vscode-button appearance="secondary" onclick="cancel()">
                                Cancel
                            </vscode-button>
                        </div>
                    </form>
                </vscode-panel-view>
            </vscode-panels>

            <script>
                const vscode = acquireVsCodeApi();

                function getConfig() {
                    const cfg ={
                        host: document.getElementById('host').value || 'localhost',
                        port: parseInt(document.getElementById('port').value) || 8500,
                        secure: document.getElementById('secure').checked
                    };
                    const token = document.getElementById('token').value;
                    if(token){
                        cfg.defaults = { token }
                    }
                    return cfg;
                }

                function testConnection() {
                    vscode.postMessage({
                        command: 'test',
                        config: getConfig()
                    });
                }

                function saveConfig() {
                    vscode.postMessage({
                        command: 'save',
                        config: getConfig()
                    });
                }

                function cancel() {
                    vscode.postMessage({ command: 'cancel' });
                }
            </script>
        </body>
        </html>
    `;
}

export const build = (context: vscode.ExtensionContext, provider: ConsulTreeDataProvider): vscode.Disposable[] => {

    const addInstanceCommand = vscode.commands.registerCommand('consul.addInstance', async () => {
        const name = await vscode.window.showInputBox({
            prompt: 'Enter a name for the Consul instance',
            placeHolder: 'e.g., Local Development'
        });

        if (name) {
            try {
                await provider.addConsulInstance(name);
                vscode.window.showInformationMessage(`Successfully added Consul instance: ${name}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to add Consul instance: ${error}`);
            }
        }
    });

    const removeInstanceCommand = vscode.commands.registerCommand('consul.removeInstance', async (node) => {
        if (node) {
            await provider.removeConsulInstance(node.label);
            vscode.window.showInformationMessage(`Removed Consul instance: ${node.label}`);
        }
    });

    const refreshCommand = vscode.commands.registerCommand('consul.refresh', () => {
        provider.refresh();
    });

    const connectCommand = vscode.commands.registerCommand('consul.connect', async (node) => {
        if (node) {
            try {
                await provider.connectInstance(node.label);
                // vscode.window.showInformationMessage(`Connected to Consul instance: ${node.label}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to connect: ${error}`);
            }
        }
    });

    const disconnectCommand = vscode.commands.registerCommand('consul.disconnect', async (node) => {
        if (node) {
            await provider.disconnectInstance(node.label);
            vscode.window.showInformationMessage(`Disconnected from Consul instance: ${node.label}`);
        }
    });

    const configPanels = new Map<string, vscode.WebviewPanel>();

    const configureInstanceCommand = vscode.commands.registerCommand('consul.configureInstance', async (node: ConsulInstanceTreeItem) => {
        if (!node) {
            return;
        }

        const existingPanel = configPanels.get(node.label);
        if (existingPanel) {
            existingPanel.reveal();
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'consulConfig',
            `Configure ${node.label}`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'media', 'webview')
                ]
            }
        );

        // 保存到映射中
        configPanels.set(node.label, panel);

        // 当面板关闭时从映射中移除
        panel.onDidDispose(() => {
            configPanels.delete(node.label);
        });

        // 获取 webview 工具包的本地路径
        const toolkitUri = panel.webview.asWebviewUri(
            vscode.Uri.joinPath(context.extensionUri, 'media', 'webview', 'toolkit.bundle.js')
        );

        // 获取当前配置
        const currentConfig = node.provider.getConfig() || {};

        // 设置 webview 内容
        panel.webview.html = getConfigWebviewContent(node.label, currentConfig, toolkitUri);

        // 处理来自 webview 的消息
        panel.webview.onDidReceiveMessage(async message => {
            switch (message.command) {
                case 'save':
                    try {
                        const cfg: ConsulOptions = message.config;
                        node.provider.setConfig(cfg);
                        await provider.persistInstances();
                        vscode.window.showInformationMessage('Configuration saved successfully');
                        panel.dispose();
                    } catch (error) {
                        vscode.window.showErrorMessage(`Failed to save configuration: ${error}`);
                    }
                    break;
                case 'test':
                    try {
                        const cfg: ConsulOptions = message.config;
                        const consul = new Consul(cfg);
                        await consul.agent.members();
                        vscode.window.showInformationMessage(`Connection[${node.label}] test successful`);
                    } catch (error) {
                        vscode.window.showErrorMessage(`Connection test failed: ${error}`);
                    }
                    break;
                case 'cancel':
                    panel.dispose();
                    break;
            }
        });
    });
    return [addInstanceCommand, removeInstanceCommand, refreshCommand, connectCommand, disconnectCommand, configureInstanceCommand];
};