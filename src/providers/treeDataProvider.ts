import * as vscode from 'vscode';
import { ConsulOptions } from 'consul/lib/consul';
import ConsulProvider from './consulProvider';
import KVTreeItem from '../kv/treeitem';
import ConsulInstanceTreeItem from '../instance/treeitem';
import ACLTreeItem from '../acl/treeitem';
import PolicyTreeItem from '../acl/policy/treeitem';
import CatalogTreeItem from '../catelog/treeitem';
import Viewer from '../view';

interface ConsulInstanceInfo {
    label: string;
    config: ConsulOptions | null;
}

export type ConsulTreeItem = ConsulInstanceTreeItem | KVTreeItem | CatalogTreeItem | ACLTreeItem | PolicyTreeItem;

export class ConsulTreeDataProvider implements vscode.TreeDataProvider<ConsulTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<void | ConsulInstanceTreeItem | null> = new vscode.EventEmitter<void | ConsulInstanceTreeItem | null>();
    readonly onDidChangeTreeData: vscode.Event<void | ConsulInstanceTreeItem | null> = this._onDidChangeTreeData.event;
    private consulInstances: Map<string, ConsulProvider> = new Map();
    public readonly view: Viewer;

    constructor(private context: vscode.ExtensionContext) {
        this.loadPersistedInstances();
        this.view = new Viewer(context);
    }

    private loadPersistedInstances() {
        const instances = this.context.globalState.get<ConsulInstanceInfo[]>('consulInstances', []);
        instances.forEach((instance) => {
            const { label, config } = instance;
            const provider = new ConsulProvider(label);
            this.consulInstances.set(label, provider);
            if (config) {
                provider.setConfig(config);
            }
        });
        return [];
    }

    public async persistInstances() {
        const instances: ConsulInstanceInfo[] = Array.from(this.consulInstances.entries()).map(([label, provider]) => ({
            label,
            config: provider.getConfig(),
        }));
        await this.context.globalState.update('consulInstances', instances);
    }

    public getProvider(label: string): ConsulProvider | undefined {
        return this.consulInstances.get(label);
    }

    public getActiveProvider(label: string): ConsulProvider {
        const provider = this.consulInstances.get(label);
        if (!provider) {
            throw new Error(`Consul instance ${label} not found`);
        }
        return provider;
    }

    getTreeItem(element: ConsulTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: ConsulTreeItem): Promise<ConsulTreeItem[]> {
        if (!element) {
            return Array.from(this.consulInstances.entries()).map(([label, provider]) =>
                provider.createTreeItem(provider.isConnected ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None)
            );
        }

        return await element.getChildren();
    }

    async addConsulInstance(label: string) {
        const provider = new ConsulProvider(label);
        try {
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
