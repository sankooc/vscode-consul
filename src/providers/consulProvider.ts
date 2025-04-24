import * as vscode from 'vscode';
// import type vscode from 'vscode';
import Consul from 'consul';
import type { ConsulOptions } from 'consul/lib/consul';
import { RegisterOptions } from 'consul/lib/agent/service';
import { ConsulNode, ConsulService, KVItem } from '../common';
import ConsulInstanceTreeItem from '../instance/treeitem';
import KVTreeItem from '../kv/treeitem';
import CatalogTreeItem from '../catelog/treeitem';
import { PolicyCreateOption, PolicyResult } from 'consul/lib/acl/policy';
import { TokenResult } from 'consul/lib/acl/token';
import { Role } from 'consul/lib/acl/role';
import { TemplatedPolicy } from 'consul/lib/acl/templatedPolicy';

export default class ConsulProvider {
    private _consul: Consul | undefined;
    private _onDidChangeKVTreeData: vscode.EventEmitter<void | KVTreeItem | null> = new vscode.EventEmitter<void | KVTreeItem | null>();
    private _onDidChangeServiceTreeData: vscode.EventEmitter<void | CatalogTreeItem | null> = new vscode.EventEmitter<void | CatalogTreeItem | null>();
    readonly onDidChangeKVTreeData: vscode.Event<void | KVTreeItem | null> = this._onDidChangeKVTreeData.event;
    readonly onDidChangeServiceTreeData: vscode.Event<void | CatalogTreeItem | null> = this._onDidChangeServiceTreeData.event;

    private cfg: ConsulOptions | undefined;
    private _isConnected: boolean = false;

    private _instance: any | undefined;
    constructor(private label: string) {}

    public get isConnected(): boolean {
        return this._isConnected;
    }

    public getLabel(): string {
        return this.label;
    }

    public setConfig(opt: ConsulOptions): void {
        this.cfg = opt;
    }
    public getConfig(): ConsulOptions | null {
        if (!this.cfg) {
            return null;
        }
        return JSON.parse(JSON.stringify(this.cfg));
    }
    public getURLString() {
        if (!this._isConnected) {
            return 'disconnected';
        }
        if (this.cfg) {
            return `${this.cfg.host}:${this.cfg.port}`;
        }
        return 'unkown';
    }

    public async connect(): Promise<void> {
        if (!this.cfg) {
            throw new Error('no consul config');
        }
        try {
            this._consul = new Consul(this.cfg);
            const sf = await this._consul.agent.self();
            if (sf?.Config?.NodeName) {
                //todo ??
                this._instance = sf.Config;
                this._isConnected = true;
            } else {
                vscode.window.showErrorMessage('connect failed');
            }
        } catch (error) {
            this._isConnected = false;
            throw error;
        }
    }

    public async disconnect(): Promise<void> {
        this._consul = undefined;
        this._isConnected = false;
    }

    public refresh(): void {
        this._onDidChangeKVTreeData.fire();
        this._onDidChangeServiceTreeData.fire();
    }

    public async loadAllKV(): Promise<KVItem[]> {
        if (!this._consul) {
            return [];
        }

        try {
            const result = await this._consul.kv.keys('');
            if (!result) {
                return [];
            }
            const keys = Array.isArray(result) ? result : [result];
            const rs: KVItem[] = [];
            for (const key of keys) {
                const value = await this.getKVValue(key);
                if (value) {
                    rs.push({ key, value });
                }
            }
            return rs;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to get KV pairs: ${error}`);
            return [];
        }
    }
    public async saveKVs(items: KVItem[]) {
        if (!this._consul) {
            throw new Error('Not connected to Consul');
        }
        for (const item of items) {
            const { key, value } = item;
            await this._consul.kv.set(key, value);
        }
        this.refresh();
    }
    public async getKVTree(): Promise<string[]> {
        if (!this._consul) {
            return [];
        }

        try {
            const result = await this._consul.kv.keys('');
            if (!result) {
                return [];
            }

            return Array.isArray(result) ? result : [result];
            // return await ConsulProvider.buildKVTree(this, items);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to get KV pairs: ${error}`);
            return [];
        }
    }

    // public static buildKVTree(provider: ConsulProvider | undefined, items: Array<string>): KVTreeItem[] {
    //     const root: { [key: string]: any } = {};
    //     for (const item of items) {
    //         const parts: string[] = item.split('/');
    //         let current = root;
    //         for (let i = 0; i < parts.length; i++) {
    //             const part = parts[i];
    //             if (i === parts.length - 1) {
    //                 current[part] = {
    //                     isLeaf: true,
    //                     key: item
    //                 };
    //             } else {
    //                 current[part] = current[part] || {};
    //                 current = current[part];
    //             }
    //         }
    //     }

    //     return this.convertToTreeItems(provider, root, '');
    // }

    // public static convertToTreeItems(provider: ConsulProvider | undefined, node: ConsulTreeNode, path: string = ''): KVTreeItem[] {
    //     return Object.entries(node).map(([name, value]) => {
    //         const currentPath = path ? `${path}/${name}` : name;
    //         if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    //             if (value.isLeaf) {
    //                 return new KVTreeItem(
    //                     name,
    //                     currentPath,
    //                     vscode.TreeItemCollapsibleState.None,
    //                     'kvLeaf',
    //                     provider
    //                 );
    //             } else {
    //                 return new KVTreeItem(
    //                     name,
    //                     currentPath,
    //                     vscode.TreeItemCollapsibleState.Collapsed,
    //                     'kvFolder',
    //                     undefined,
    //                     this.convertToTreeItems(provider, value as ConsulTreeNode, currentPath)
    //                 );
    //             }
    //         }
    //         // Handle other cases or throw an error
    //         throw new Error(`Unexpected value type for key ${name}`);
    //     });
    // }

    public async getNodes(): Promise<ConsulNode[]> {
        if (!this._consul) {
            return [];
        }

        try {
            return this._consul.catalog.node.list();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to get services: ${error}`);
            return [];
        }
    }

    public async getServices(node: string): Promise<ConsulService[]> {
        if (!this._consul) {
            return [];
        }

        try {
            const rs = await this._consul.catalog.node.services(node);
            if (rs) {
                return Object.values(rs.Services);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to get services: ${error}`);
        }
        return [];
    }

    public async registerService(opt: RegisterOptions): Promise<void> {
        if (!this._consul) {
            throw new Error('Consul client not initialized');
        }
        try {
            const result = await this._consul.agent.service.register(opt);
            if (result) {
                this._onDidChangeServiceTreeData.fire();
            }
            return result;
        } catch (error) {
            vscode.window.showErrorMessage('Failed to register');
            throw error;
        }
    }

    public async updateKV(key: string, value: string): Promise<void> {
        if (!this._consul) {
            throw new Error('Not connected to Consul');
        }

        await this._consul.kv.set(key, value);
        this.refresh();
    }

    public async addKV(key: string): Promise<void> {
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

    public async register(opt: RegisterOptions): Promise<void> {
        if (!this._consul) {
            throw new Error('Consul client not initialized');
        }
        try {
            const result = await this._consul.catalog.register(opt as any);
            if (result) {
                this._onDidChangeKVTreeData.fire();
            }
            // return result;
        } catch (error) {
            vscode.window.showErrorMessage('Failed to register');
            throw error;
        }
    }

    check(): void {
        if (!this._consul) {
            throw new Error('Consul client not initialized');
        }
    }
    public async snapshot(): Promise<Buffer> {
        this.check();
        const buf = this._consul!.snapshot();
        return buf;
    }
    public async restore(buf: Buffer): Promise<void> {
        this.check();
        await this._consul!.restore(buf);
    }
    public async list_policy(): Promise<PolicyResult[]> {
        this.check();
        return this._consul!.acl.policy.list();
    }
    public async add_policy(opt: PolicyCreateOption): Promise<void> {
        this.check();
        this._consul!.acl.policy.create(opt);
    }
    public async del_policy(id: string): Promise<void> {
        this.check();
        this._consul!.acl.policy.delete(id);
    }

    public async read_policy(id: string): Promise<PolicyResult> {
        this.check();
        return this._consul!.acl.policy.read(id);
    }

    public async update_policy(id: string, opt: PolicyCreateOption): Promise<PolicyResult> {
        this.check();
        return this._consul!.acl.policy.update(id, opt);
    }

    public async list_token(): Promise<TokenResult[]> {
        this.check();
        return this._consul!.acl.token.list();
    }
    public async add_token(opt: PolicyCreateOption): Promise<void> {
        this.check();
        this._consul!.acl.token.create(opt);
    }
    public async del_token(id: string): Promise<void> {
        this.check();
        this._consul!.acl.token.delete(id);
    }

    public async list_role(): Promise<Role[]> {
        this.check();
        return this._consul!.acl.role.list();
    }
    public async add_role(opt: Role): Promise<void> {
        this.check();
        this._consul!.acl.role.create(opt);
    }
    public async del_role(id: string): Promise<void> {
        this.check();
        this._consul!.acl.role.delete(id);
    }
    public async list_template_policy(): Promise<TemplatedPolicy[]> {
        this.check();
        return this._consul!.acl.templatedPolicy.list();
    }

    public createTreeItem(collapsibleState: vscode.TreeItemCollapsibleState): ConsulInstanceTreeItem {
        return new ConsulInstanceTreeItem(this.label, this, collapsibleState);
    }
}
