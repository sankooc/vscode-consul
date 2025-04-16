import * as vscode from 'vscode';
import { ConsulProvider, KVTreeItem, ServiceTreeItem, ConsulInstanceTreeItem } from './consulProvider';
import { ConsulOptions } from 'consul/lib/consul';

interface ConsulInstanceInfo {
    label: string;
    config: ConsulOptions | null;
}

export class KVTreeDataProvider implements vscode.TreeDataProvider<KVTreeItem> {
    constructor(private consulProvider: ConsulProvider) {}

    getTreeItem(element: KVTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: KVTreeItem): Promise<KVTreeItem[]> {
        if (element) {
            return element.children || [];
        } else {
            return this.consulProvider.getKVTree();
        }
    }

    get onDidChangeTreeData(): vscode.Event<KVTreeItem | undefined | null | void> {
        return this.consulProvider.onDidChangeKVTreeData;
    }
}

export class ServiceTreeDataProvider implements vscode.TreeDataProvider<ServiceTreeItem> {
    constructor(private consulProvider: ConsulProvider) {}

    getTreeItem(element: ServiceTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: ServiceTreeItem): Promise<ServiceTreeItem[]> {
        if (element) {
            return [];
        } else {
            return this.consulProvider.getServices();
        }
    }

    get onDidChangeTreeData(): vscode.Event<ServiceTreeItem | undefined | null | void> {
        return this.consulProvider.onDidChangeServiceTreeData;
    }
}

export class ConsulTreeDataProvider implements vscode.TreeDataProvider<ConsulInstanceTreeItem | KVTreeItem | ServiceTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<void | ConsulInstanceTreeItem | null> = new vscode.EventEmitter<void | ConsulInstanceTreeItem | null>();
    readonly onDidChangeTreeData: vscode.Event<void | ConsulInstanceTreeItem | null> = this._onDidChangeTreeData.event;
    private consulInstances: Map<string, ConsulProvider> = new Map();

    constructor(private context: vscode.ExtensionContext) {
        this.loadPersistedInstances();
    }

    private loadPersistedInstances() {
        const instances = this.context.globalState.get<ConsulInstanceInfo[]>('consulInstances', []);
        instances.forEach(instance => {
            const { label, config } = instance;
            const provider = new ConsulProvider(label);
            this.consulInstances.set(label, provider);
            if(config){
                provider.setConfig(config);
            }
        });
        return [];
    }

    public async persistInstances() {
        const instances: ConsulInstanceInfo[] = Array.from(this.consulInstances.entries()).map(([label, provider]) => ({
            label,
            config: provider.getConfig()
        }));
        await this.context.globalState.update('consulInstances', instances);
    }

    getTreeItem(element: ConsulInstanceTreeItem | KVTreeItem | ServiceTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: ConsulInstanceTreeItem | KVTreeItem | ServiceTreeItem): Promise<(ConsulInstanceTreeItem | KVTreeItem | ServiceTreeItem)[]> {
        if (!element) {
            return Array.from(this.consulInstances.entries()).map(([label, provider]) => 
                provider.createTreeItem(provider.isConnected?vscode.TreeItemCollapsibleState.Collapsed: vscode.TreeItemCollapsibleState.None )
            );
        }

        if (element instanceof ConsulInstanceTreeItem) {
            if (!element.isConnected) {
                return [];
            }
            // element.provider;
            return [
                new KVTreeItem('Key/Value', '', vscode.TreeItemCollapsibleState.Collapsed, 'kvRoot', element.provider),
                new ServiceTreeItem('Services', [], vscode.TreeItemCollapsibleState.Collapsed)
            ];
        }

        if (element instanceof KVTreeItem && element.contextValue === 'kvRoot') {
            // const provider = this.consulInstances.get(element.consulInstance);
            const provider = element.provider;
            return provider && provider.isConnected ? provider.getKVTree() : [];
        }

        if (element instanceof KVTreeItem) {
            return element.children || [];
        }

        return [];
    }

    async addConsulInstance(label: string, url: string, token: string) {
        const provider = new ConsulProvider(label);
        try {
            // await provider.login(token);
            this.consulInstances.set(label, provider);
            await this.persistInstances();
            this._onDidChangeTreeData.fire();
        } catch (error) {
            throw new Error(`Failed to connect to Consul: ${error}`);
        }
    }

    async connectInstance(label: string) {
        const provider = this.consulInstances.get(label);
        if (provider) {
            try {
                await provider.connect();
                // await this.persistInstances();
                this._onDidChangeTreeData.fire();
            } catch (error) {
                throw new Error(`Failed to connect to Consul: ${error}`);
            }
        }
    }

    async disconnectInstance(label: string) {
        const provider = this.consulInstances.get(label);
        if (provider) {
            await provider.disconnect();
            this._onDidChangeTreeData.fire();
        }
    }

    async removeConsulInstance(label: string) {
        this.consulInstances.delete(label);
        await this.persistInstances();
        this._onDidChangeTreeData.fire();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}
