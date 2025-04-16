// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ConsulTreeDataProvider } from './providers/treeDataProvider';
import { ConsulInstanceTreeItem, ConsulProvider, KVTreeItem } from './providers/consulProvider';
import { Consul, ConsulOptions } from 'consul/lib/consul';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const consulTreeProvider = new ConsulTreeDataProvider(context);
    vscode.window.registerTreeDataProvider('consulInstances', consulTreeProvider);

    let addInstanceCommand = vscode.commands.registerCommand('consul.addInstance', async () => {
        const name = await vscode.window.showInputBox({
            prompt: 'Enter a name for the Consul instance',
            placeHolder: 'e.g., Local Development'
        });

        if (name) {
            try {
                await consulTreeProvider.addConsulInstance(name, 'http://127.0.0.1:8500', '3d461f18-f07a-797c-8bfa-24b1f72445e9');
                vscode.window.showInformationMessage(`Successfully added Consul instance: ${name}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to add Consul instance: ${error}`);
            }
        }
    });

    let removeInstanceCommand = vscode.commands.registerCommand('consul.removeInstance', async (node) => {
        if (node) {
            await consulTreeProvider.removeConsulInstance(node.label);
            vscode.window.showInformationMessage(`Removed Consul instance: ${node.label}`);
        }
    });

    let refreshCommand = vscode.commands.registerCommand('consul.refresh', () => {
        consulTreeProvider.refresh();
    });

    let refreshKVCommand = vscode.commands.registerCommand('consul.refreshKV', (node) => {
        consulTreeProvider.refresh();
    });

    let addKVCommand = vscode.commands.registerCommand('consul.addKV', async (node: KVTreeItem) => {
        const provider = node.provider
        if (provider) {
            const key = await vscode.window.showInputBox({
                prompt: 'Enter key name',
                placeHolder: 'e.g., config/app/settings'
            });
            try {
                if (key) {
                    await provider.addKV(key);
                    consulTreeProvider.persistInstances();
                    consulTreeProvider.refresh();
                    vscode.window.showInformationMessage('Successfully added key/value pair');

                }
            } catch (e) {
                console.error(e);
            }
        } else {
            vscode.window.showErrorMessage('no provider');
        }
    });

    let editKVCommand = vscode.commands.registerCommand('consul.editKV', async (node) => {
        const value = await vscode.window.showInputBox({
            prompt: 'Enter new value',
            value: node.value
        });

        // if (value !== undefined) {
        //     try {
        //         await consulTreeProvider.editKV(node.consulInstance, node.key, value);
        //         vscode.window.showInformationMessage('Successfully updated value');
        //     } catch (error) {
        //         vscode.window.showErrorMessage(`Failed to update value: ${error}`);
        //     }
        // }
    });

    let deleteKVCommand = vscode.commands.registerCommand('consul.deleteKVPair', async (node: KVTreeItem) => {
        const answer = await vscode.window.showWarningMessage(
            `Are you sure you want to delete key '${node.key}'?`,
            { modal: true },
            'Yes'
        );

        if (answer === 'Yes' && node.provider) {
            try {
                await node.provider.deleteKV(node.key);
                consulTreeProvider.persistInstances();
                consulTreeProvider.refresh();
                vscode.window.showInformationMessage('Successfully deleted key');
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to delete key: ${error}`);
            }
        }
    });

    class ConsulKVFileSystemProvider implements vscode.FileSystemProvider {
        private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
        private _contents = new Map<string, Uint8Array>();
        private _providers = new Map<string, ConsulProvider>();

        readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

        watch(uri: vscode.Uri): vscode.Disposable {
            return new vscode.Disposable(() => { });
        }

        stat(uri: vscode.Uri): vscode.FileStat {
            return {
                type: vscode.FileType.File,
                ctime: Date.now(),
                mtime: Date.now(),
                size: this._contents.get(KVTreeItem.parseKey(uri))?.length || 0
            };
        }

        readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
            return [];
        }

        createDirectory(uri: vscode.Uri): void { }

        async readFile(uri: vscode.Uri): Promise<Uint8Array> {
            const key = KVTreeItem.parseKey(uri);
            const data = this._contents.get(key);
            if (data) {
                return data;
            }
            throw vscode.FileSystemError.FileNotFound(uri);
        }

        async writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean, overwrite: boolean }): Promise<void> {
            const key = KVTreeItem.parseKey(uri);
            const provider = this._providers.get(key);
            if (!provider) {
                throw vscode.FileSystemError.NoPermissions(uri);
            }

            try {
                const value = new TextDecoder().decode(content);
                await provider.setKVValue(key, value);
                this._contents.set(key, content);
                this._emitter.fire([{ type: vscode.FileChangeType.Changed, uri }]);
            } catch (error) {
                throw vscode.FileSystemError.NoPermissions(uri);
            }
        }

        delete(uri: vscode.Uri): void {
            const key = KVTreeItem.parseKey(uri);
            this._contents.delete(key);
            this._providers.delete(key);
        }

        rename(oldUri: vscode.Uri, newUri: vscode.Uri): void {
            const oldKey = KVTreeItem.parseKey(oldUri);
            const newKey = KVTreeItem.parseKey(newUri);
            const content = this._contents.get(oldKey);
            const provider = this._providers.get(oldKey);
            if (content && provider) {
                this._contents.set(newKey, content);
                this._providers.set(newKey, provider);
                this._contents.delete(oldKey);
                this._providers.delete(oldKey);
            }
        }

        // 添加新方法来设置初始内容
        async setInitialContent(key: string, content: string, provider: ConsulProvider): Promise<void> {
            this._contents.set(key, new TextEncoder().encode(content));
            this._providers.set(key, provider);
        }
    }

    
    const kvFileSystemProvider = new ConsulKVFileSystemProvider();
    const registration = vscode.workspace.registerFileSystemProvider('consul-kv', kvFileSystemProvider, {
        isCaseSensitive: true,
        isReadonly: false
    });
    context.subscriptions.push(registration);

    const openKVEditorCommand = vscode.commands.registerCommand('consul.openKVEditor', async (node: KVTreeItem) => {
        if (!node.provider || !node.key) {
            return;
        }

        try {
            const uri = node.buildURI();
            const existingEditors = vscode.window.visibleTextEditors.filter(
                editor => editor.document.uri.toString() === uri.toString()
            );

            if (existingEditors.length > 0) {
                await vscode.window.showTextDocument(existingEditors[0].document);
                return;
            }
            const value = await node.provider.getKVValue(node.key);

            await kvFileSystemProvider.setInitialContent(node.key, value || '', node.provider);
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open KV editor: ${error}`);
        }
    });

    const connectCommand = vscode.commands.registerCommand('consul.connect', async (node) => {
        if (node) {
            try {
                await consulTreeProvider.connectInstance(node.label);
                // vscode.window.showInformationMessage(`Connected to Consul instance: ${node.label}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to connect: ${error}`);
            }
        }
    });

    let disconnectCommand = vscode.commands.registerCommand('consul.disconnect', async (node) => {
        if (node) {
            await consulTreeProvider.disconnectInstance(node.label);
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
                        await consulTreeProvider.persistInstances();
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

    context.subscriptions.push(
        addInstanceCommand,
        removeInstanceCommand,
        refreshCommand,
        refreshKVCommand,
        addKVCommand,
        editKVCommand,
        deleteKVCommand,
        openKVEditorCommand,
        connectCommand,
        disconnectCommand,
        configureInstanceCommand
    );

    // Webview 内容生成函数
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
}

// This method is called when your extension is deactivated
export function deactivate() { }
