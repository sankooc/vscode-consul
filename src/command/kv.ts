import { ConsulProvider, KVTreeItem } from "../providers/consulProvider";
import { ConsulTreeDataProvider } from "../providers/treeDataProvider";
import vscode from 'vscode';

export const build = (context: vscode.ExtensionContext, consulTreeProvider: ConsulTreeDataProvider): vscode.Disposable[] => {
    
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


    const refreshKVCommand = vscode.commands.registerCommand('consul.refreshKV', (node) => {
        consulTreeProvider.refresh();
    });

    const addKVCommand = vscode.commands.registerCommand('consul.addKV', async (node: KVTreeItem) => {
        const provider = node.provider;
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

    const deleteKVCommand = vscode.commands.registerCommand('consul.deleteKVPair', async (node: KVTreeItem) => {
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

    return [addKVCommand, refreshKVCommand, deleteKVCommand, openKVEditorCommand];
}
