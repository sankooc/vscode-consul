import * as vscode from 'vscode';
import { ConsulProvider, KVTreeItem, CatalogTreeItem, ConsulInstanceTreeItem } from './consulProvider';
import { ConsulOptions } from 'consul/lib/consul';

interface ConsulInstanceInfo {
    label: string;
    config: ConsulOptions | null;
}

export class ConsulTreeDataProvider implements vscode.TreeDataProvider<ConsulInstanceTreeItem | KVTreeItem | CatalogTreeItem> {
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

    getTreeItem(element: ConsulInstanceTreeItem | KVTreeItem | CatalogTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: ConsulInstanceTreeItem | KVTreeItem | CatalogTreeItem): Promise<(ConsulInstanceTreeItem | KVTreeItem | CatalogTreeItem)[]> {
        if (!element) {
            return Array.from(this.consulInstances.entries()).map(([label, provider]) => 
                provider.createTreeItem(provider.isConnected?vscode.TreeItemCollapsibleState.Collapsed: vscode.TreeItemCollapsibleState.None )
            );
        }

        if (element instanceof ConsulInstanceTreeItem) {
            if (!element.isConnected) {
                return [];
            }
            return [
                // new KVTreeItem('Key/Value', '', vscode.TreeItemCollapsibleState.Collapsed, 'kvRoot', element.provider),
                KVTreeItem.rootItem(element.provider),
                CatalogTreeItem.rootItem(element.provider),
            ];
        }

        if (element instanceof KVTreeItem && element.contextValue === 'kvRoot') {
            const provider = element.provider;
            return provider && provider.isConnected ? provider.getKVTree() : [];
        }

        if (element instanceof KVTreeItem) {
            return element.children || [];
        }
        if (element instanceof CatalogTreeItem) {
            return []; // TODO
        }

        return [];
    }

    async addConsulInstance(label: string) {
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
