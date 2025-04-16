import * as vscode from 'vscode';
// import type vscode from 'vscode';
import Consul from 'consul';
import type { ConsulOptions } from 'consul/lib/consul';

export class ConsulProvider {
    private _consul: Consul | undefined;
    private _onDidChangeKVTreeData: vscode.EventEmitter<void | KVTreeItem | null> = new vscode.EventEmitter<void | KVTreeItem | null>();
    private _onDidChangeServiceTreeData: vscode.EventEmitter<void | ServiceTreeItem | null> = new vscode.EventEmitter<void | ServiceTreeItem | null>();
    readonly onDidChangeKVTreeData: vscode.Event<void | KVTreeItem | null> = this._onDidChangeKVTreeData.event;
    readonly onDidChangeServiceTreeData: vscode.Event<void | ServiceTreeItem | null> = this._onDidChangeServiceTreeData.event;

    private cfg: ConsulOptions | undefined;
    private _isConnected: boolean = false;

    private _instance: any | undefined;
    constructor(private label: string) { }

    public get isConnected(): boolean {
        return this._isConnected;
    }

    public setConfig(opt: ConsulOptions): void {
        this.cfg = opt;
    }
    public getConfig(): ConsulOptions | null {
        if(!this.cfg){
            return null;
        }
        return JSON.parse(JSON.stringify(this.cfg))
    }
    public getURLString(){
        if(!this._isConnected){
            return 'disconnected';
        }
        if(this.cfg){
            return `${this.cfg.host}:${this.cfg.port}`;
        }
        return 'unkown';
    }

    public async connect(): Promise<void> {
        if(!this.cfg){
            throw new Error('no consul config');
        }
        try {
            this._consul = new Consul(this.cfg);
            const sf = await this._consul.agent.self();
            if(sf?.Config?.NodeName){ //todo ??
                this._instance = sf.Config;
                this._isConnected = true;
            } else {
                vscode.window.showErrorMessage('connect failed');
            }
            // const member = await this._consul.agent.members();
            // console.log(member);
            // this._isConnected = true;
        } catch (error) {
            this._isConnected = false;
            throw error;
        }
    }

    public async disconnect(): Promise<void> {
        this._consul = undefined;
        this._isConnected = false;
    }


    public async services(): Promise<any[]> {
        if(this._instance){
            const { NodeName } = this._instance;
            const { Services } = await this._consul?.catalog.node.services(NodeName);
            console.log(Services);
            return Object.values(Services);
        }
        return [];
    }

    public refresh(): void {
        this._onDidChangeKVTreeData.fire();
        this._onDidChangeServiceTreeData.fire();
    }

    public async getKVTree(): Promise<KVTreeItem[]> {
        if (!this._consul) {
            return [];
        }

        try {
            const result = await this._consul.kv.keys('');
            if (!result) {
                return [];
            }

            const items = Array.isArray(result) ? result : [result];
            const label = this.label;
            return await ConsulProvider.buildKVTree(this, items);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to get KV pairs: ${error}`);
            return [];
        }
    }

    public static buildKVTree(provider: ConsulProvider | undefined, items: Array<string>): KVTreeItem[] {
        const root: { [key: string]: any } = {};
        for (const item of items) {
            const parts: string[] = item.split('/');
            let current = root;
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (i === parts.length - 1) {
                    current[part] = {
                        isLeaf: true,
                        key: item
                    };
                } else {
                    current[part] = current[part] || {};
                    current = current[part];
                }
            }
        }

        return this.convertToTreeItems(provider, root, '');
    }

    public static convertToTreeItems(provider: ConsulProvider | undefined, node: ConsulTreeNode, path: string = ''): KVTreeItem[] {
        return Object.entries(node).map(([name, value]) => {
            const currentPath = path ? `${path}/${name}` : name;
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                if (value.isLeaf) {
                    return new KVTreeItem(
                        name,
                        currentPath,
                        vscode.TreeItemCollapsibleState.None,
                        'kvLeaf',
                        provider
                    );
                } else {
                    return new KVTreeItem(
                        name,
                        currentPath,
                        vscode.TreeItemCollapsibleState.Collapsed,
                        'kvFolder',
                        undefined,
                        this.convertToTreeItems(provider, value as ConsulTreeNode, currentPath)
                    );
                }
            }
            // Handle other cases or throw an error
            throw new Error(`Unexpected value type for key ${name}`);
        });
    }

    public async getServices(): Promise<ServiceTreeItem[]> {
        if (!this._consul) {
            return [];
        }

        try {
            const services = await this._consul.catalog.service.list() as Record<string, string[]>;
            return Object.entries(services).map(([name, tags]) => {
                return new ServiceTreeItem(
                    name,
                    tags,
                    vscode.TreeItemCollapsibleState.None,
                );
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to get services: ${error}`);
            return [];
        }
    }

    public async updateKV(key: string, value: string): Promise<void> {
        if (!this._consul) {
            throw new Error('Not connected to Consul');
        }

        await this._consul.kv.set(key, value);
        this.refresh();
    }

    public async addKV(key: string): Promise<void>{
        if (!this._consul) {
            throw new Error('Not connected to Consul');
        }
        await this._consul.kv.set(key, '');
    }

    public async deleteKV(key: string): Promise<void> {
        if (!this._consul) {
            throw new Error('Not connected to Consul');
        }

        await this._consul.kv.del(key);
        this.refresh();
    }

    public async getKVValue(key: string): Promise<string | null> {
        if (!this._consul) {
            throw new Error('Consul client not initialized');
        }
        try {
            const result = await this._consul.kv.get(key);
            if (!result) {
                return null;
            }
            return result.Value;
            // Consul API returns value in base64 format
            // return Buffer.from(result.Value as string, 'base64').toString();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to get KV value: ${error}`);
            throw error;
        }
    }

    public async setKVValue(key: string, value: string): Promise<boolean> {
        if (!this._consul) {
            throw new Error('Consul client not initialized');
        }
        try {
            const result = await this._consul.kv.set(key, value);
            if (result) {
                this._onDidChangeKVTreeData.fire();
            }
            return result;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to set KV value: ${error}`);
            throw error;
        }
    }

    public createTreeItem(collapsibleState: vscode.TreeItemCollapsibleState): ConsulInstanceTreeItem {
        return new ConsulInstanceTreeItem(
            this.label, 
            this,
            collapsibleState
        );
    }
}

interface ConsulTreeNode {
    isLeaf?: boolean;
    [key: string]: ConsulTreeNode | boolean | string | undefined;
}

export class KVTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly key: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly provider: ConsulProvider | undefined,
        public readonly children?: KVTreeItem[]
    ) {
        super(label, collapsibleState);
        this.tooltip = `${key}`;
        this.description = '';
        
        // 为叶子节点添加编辑命令
        if (this.contextValue === 'kvLeaf') {
            this.command = {
                command: 'consul.openKVEditor',
                title: 'Edit KV',
                arguments: [this]
            };
        }

        // 设置图标
        if (this.contextValue === 'kvRoot') {
            this.iconPath = new vscode.ThemeIcon('versions');
        } else if (this.contextValue === 'kvLeaf') {
            this.iconPath = new vscode.ThemeIcon('gist');
        } else {
            this.iconPath = new vscode.ThemeIcon('folder');
        }
    }
    buildURI(): vscode.Uri{
        const scheme = 'consul-kv';
        return vscode.Uri.parse(`${scheme}:/${this.key}`).with({ scheme });
    }
    static parseKey(uri: vscode.Uri): string {
        return uri.path.replace(/^\//, '');
    }
}

export class ServiceTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly tags: string[],
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    ) {
        super(label, collapsibleState);
        this.tooltip = `${label} [${tags.join(', ')}]`;
        this.description = tags.join(', ');
        this.contextValue = 'service';
    }
}

export class ConsulInstanceTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly provider: ConsulProvider,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.contextValue = this.provider.isConnected ? 'consulInstanceConnected' : 'consulInstanceDisconnected';
        this.description = this.provider.getURLString();
        this.iconPath = new vscode.ThemeIcon(this.provider.isConnected ? 'plug' : 'debug-disconnect');
        if (this.provider.isConnected) {
            this.iconPath = new vscode.ThemeIcon('plug', new vscode.ThemeColor('charts.green'));
        }
    }
    public get isConnected(): boolean {
        return this.provider.isConnected;
    }
}
