import { KVItem, unzipData, zipData } from '../common';
import ConsulProvider from '../providers/consulProvider';
import KVTreeItem from './treeitem';
import { ConsulTreeDataProvider } from '../providers/treeDataProvider';
import vscode from 'vscode';

const STRICT_REGEX = /^(?!\/)(?!.*\/$)(?!.*\/\/)[a-zA-Z0-9\-_.\/]+$/;

const KEY_REG = /^[a-zA-Z0-9\-_.]+$/

export default (context: vscode.ExtensionContext, consulTreeProvider: ConsulTreeDataProvider): vscode.Disposable[] => {
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
                size: this._contents.get(KVTreeItem.parseKey(uri))?.length || 0,
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

        async writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean }): Promise<void> {
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

        async setInitialContent(key: string, content: string, provider: ConsulProvider): Promise<void> {
            this._contents.set(key, new TextEncoder().encode(content));
            this._providers.set(key, provider);
        }
    }
    const kvFileSystemProvider = new ConsulKVFileSystemProvider();
    const registration = vscode.workspace.registerFileSystemProvider('consul-kv', kvFileSystemProvider, {
        isCaseSensitive: true,
        isReadonly: false,
    });
    context.subscriptions.push(registration);

    const refreshKVCommand = vscode.commands.registerCommand('consul.refreshKV', (node) => {
        consulTreeProvider.refresh();
    });

    const addKVCommand = vscode.commands.registerCommand('consul.addKV', async (node: KVTreeItem) => {
        const provider = node.provider;
        if (provider) {
            const key = (await vscode.window.showInputBox({
                prompt: 'Enter key name',
                placeHolder: 'e.g., config/app/settings',
            }))?.trim();
            try {
                if (key) {
                    if (key?.startsWith('/') || key?.endsWith('/')) {
                        vscode.window.showErrorMessage('invalid key name');
                        return;
                    }
                    if (!STRICT_REGEX.test(key)) {
                        vscode.window.showErrorMessage('invalid key name');
                        return;
                    }
                    let keyPath = key;
                    if (node.key) {
                        keyPath = node.key + '/' + key;
                    }
                    await provider.addKV(keyPath);
                    consulTreeProvider.persistInstances();
                    consulTreeProvider.refresh();
                }
            } catch (e) {
                console.error(e);
            }
        } else {
            vscode.window.showErrorMessage('no provider');
        }
    });

    const deleteKVCommand = vscode.commands.registerCommand('consul.deleteKVPair', async (node: KVTreeItem) => {
        const answer = await vscode.window.showWarningMessage(`Are you sure you want to delete key '${node.key}'?`, { modal: true }, 'Yes');

        if (answer === 'Yes' && node.provider) {
            try {
                const key = node.key;
                switch (node.contextValue) {
                    case 'kvFolder': {
                        const keys = await node.provider.getKeys(key);
                        for (const _key of keys) {
                            await node.provider.deleteKV(_key);
                        }
                        consulTreeProvider.persistInstances();
                        consulTreeProvider.refresh();
                        vscode.window.showInformationMessage('Successfully deleted folder');
                        return;

                    }
                    case 'kvLeaf': {
                        await node.provider.deleteKV(node.key);
                        consulTreeProvider.persistInstances();
                        consulTreeProvider.refresh();
                        vscode.window.showInformationMessage('Successfully deleted key');
                        return;
                    }
                    default:
                        vscode.window.showErrorMessage('Invalid key type for deletion');
                        return;
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to delete key: ${error}`);
            }
        }
    });

    const duplicate = vscode.commands.registerCommand('consul.duplicate', async (node: KVTreeItem) => {
        const provider = node.provider;
        if (provider) {
            const parentKey = node.key;
            if (!parentKey) {
                vscode.window.showErrorMessage('No parent key found for duplication');
                return;
            }
            let root = '';
            const index = parentKey.lastIndexOf('/');
            if (index > 0) {
                root = parentKey.substring(0, index) + '/';
            }
            const key = (await vscode.window.showInputBox({
                prompt: 'Enter folder name',
                placeHolder: '',
            }))?.trim();

            if (!key || !KEY_REG.test(key)) {
                vscode.window.showErrorMessage('invalid key name');
                return;
            }
            try {
                const len = parentKey.length;
                if (key && key.indexOf('/') < 0) {
                    const _k = await provider._getKeys(root + key);
                    if (_k && _k.length > 0) {
                        vscode.window.showErrorMessage(`Folder '${key}' already exists in '${root}'`);
                        return;
                    }
                    const keys = await provider.getKeys(parentKey);
                    for (const k of keys) {
                        const newPath = root + key + k.substring(len);
                        const value = await provider.getKVValue(k);
                        await provider.setKVValue(newPath, value || '');
                    }
                    consulTreeProvider.persistInstances();
                    consulTreeProvider.refresh();
                    vscode.window.showInformationMessage(`Folder '${key}' duplicated successfully in '${root}'`);
                } else {
                    vscode.window.showErrorMessage('invalid folder name');
                    return;
                }
            } catch (e) {
                console.error(e);
            }
        } else {
            vscode.window.showErrorMessage('no provider');
        }
    });

    const exportData = vscode.commands.registerCommand('consul.exportAllKV', async (node: KVTreeItem) => {
        const saveUri = await vscode.window.showSaveDialog({
            filters: { 'JSON Files': ['json'] },
        });
        if (!saveUri) {
            return;
        }
        const items = await node.provider?.loadAllKV();
        // consulTreeProvider.persistInstances();
        // consulTreeProvider.refresh();
        if (items) {
            await vscode.workspace.fs.writeFile(saveUri, zipData(items));
            vscode.window.showInformationMessage('KV data exported successfully!');
        }
    });

    const importData = vscode.commands.registerCommand('consul.importAllKV', async (node: KVTreeItem) => {
        const openUris = await vscode.window.showOpenDialog({
            filters: { 'JSON Files': ['json'] },
            canSelectMany: false,
        });
        if (!openUris || openUris.length === 0) {
            return;
        }
        const fileUri = openUris[0];
        const fileData = await vscode.workspace.fs.readFile(fileUri);
        const items: KVItem[] = unzipData(fileData);
        if (!items || !items.length) {
            vscode.window.showErrorMessage('archive format is invalid');
        } else {
            await node.provider?.saveKVs(items);
            consulTreeProvider.persistInstances();
            consulTreeProvider.refresh();
            vscode.window.showInformationMessage('KV data imported successfully!');
        }
    });

    const openKVEditorCommand = vscode.commands.registerCommand('consul.openKVEditor', async (node: KVTreeItem) => {
        if (!node.provider || !node.key) {
            return;
        }

        try {
            const uri = node.buildURI();
            const existingEditors = vscode.window.visibleTextEditors.filter((editor) => editor.document.uri.toString() === uri.toString());

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
    return [addKVCommand, refreshKVCommand, deleteKVCommand, openKVEditorCommand, exportData, importData, duplicate];
};
