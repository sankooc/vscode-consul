import * as vscode from 'vscode';
// import type vscode from 'vscode';
import Consul from 'consul';
import { Agent } from 'consul/lib/agent';
import type { ConsulOptions } from 'consul/lib/consul';
import { RegisterOptions, ServiceInfo } from 'consul/lib/agent/service';
import { RegisterOptions as CheckRegisterOptions } from 'consul/lib/agent/check';
import { ConsulNode, ConsulService, KVItem } from '../common';
import ConsulInstanceTreeItem from '../instance/treeitem';
import KVTreeItem from '../kv/treeitem';
import CatalogTreeItem from '../catelog/treeitem';
import { PolicyCreateOption, PolicyResult } from 'consul/lib/acl/policy';
import { TokenResult, TokenUpdateOptions, UpdateResult } from 'consul/lib/acl/token';
import { Role } from 'consul/lib/acl/role';
import { TemplatedPolicy } from 'consul/lib/acl/templatedPolicy';
import { Check } from 'consul/lib/agent/check';
// import * as parser from 'hcl2-parser';
// import htj from 'hcl-to-json';
// import hclToJson from "hcl-to-json";

class ConsulAgent {
    constructor(
        private consul: ConsulProvider,
        private agent: Agent
    ) {}

    public async registerService(opt: RegisterOptions): Promise<ServiceInfo> {
        const result = await this.agent.service.register(opt);
        if (result) {
            this.consul.refresh();
        }
        return result;
    }
    public async deregisterService(id: string): Promise<void> {
        const result = await this.agent.service.deregister(id);
        if (result) {
            this.consul.refresh();
        }
        return result;
    }
    public async listService(): Promise<ServiceInfo[]> {
        const listMap = await this.agent.service.list();
        return Object.values(listMap);
    }

    public async serviceConfig(id: string): Promise<ServiceInfo> {
        return this.agent.service.config(id);
    }

    public async registerCheck(opt: CheckRegisterOptions): Promise<Check> {
        const result = await this.agent.check.register(opt);
        if (result) {
            this.consul.refresh();
        }
        return result;
    }
    public async deregisterCheck(id: string): Promise<void> {
        const result = await this.agent.check.deregister(id);
        if (result) {
            this.consul.refresh();
        }
    }
    public async listChecks(): Promise<Check[]> {
        const listMap = await this.agent.check.list();
        return Object.values(listMap);
    }
}

export default class ConsulProvider {
    private _consul: Consul | undefined;
    public agent: ConsulAgent | undefined;
    private _onDidChangeTreeData: vscode.EventEmitter<void | KVTreeItem | null> = new vscode.EventEmitter<void | KVTreeItem | null>();
    // private _onDidChangeServiceTreeData: vscode.EventEmitter<void | CatalogTreeItem | null> = new vscode.EventEmitter<void | CatalogTreeItem | null>();
    readonly onDidChangeTreeData: vscode.Event<void | KVTreeItem | null> = this._onDidChangeTreeData.event;
    // readonly onDidChangeServiceTreeData: vscode.Event<void | CatalogTreeItem | null> = this._onDidChangeServiceTreeData.event;

    private cfg: ConsulOptions | undefined;
    private _isConnected: boolean = false;
    private token?: TokenResult;
    private info?: any;
    private rules: any[] = [];
    constructor(private label: string) {}

    public get isConnected(): boolean {
        return this._isConnected;
    }

    public getLabel(): string {
        return this.label;
    }

    public async getInfo(): Promise<any> {
        return this._consul?.agent.self();
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

    public async checkPermission(acl: string): Promise<boolean> {
        try {
            switch(acl){
                case 'acl':{ // acl:read
                    await this._consul?.acl.token.list();
                    return true;
                }
                case 'kv': // key:read
                    await this._consul?.kv.keys('');
                    return true;
                case 'catalog': // node:read
                    await this._consul?.catalog.node.list();
                    return true;
                case 'agent': { // service:read
                    await this._consul?.agent.services();
                    return true;
                }
            }
        } catch(error){

        }
        return false; // TODO
    }

    public async connect(): Promise<void> {
        if (!this.cfg) {
            throw new Error('no consul config');
        }
        try {
            const _consul = new Consul(this.cfg);
            const token = await _consul.acl.token.readSelf();
            // const json = JSON.stringify(info);
            // const { Policies } = token;
            // if (!Policies || !Policies.length) {
            //     throw new Error('no policies');
            // }
            
            // for (const p of Policies) {
            //     const { ID } = p;
            //     const { Rules } = await _consul.acl.policy.read(ID);
            //     if (Rules) {
            //         const rs = hclToJson(Rules);
            //         // const rs = parser.parseToObject(Rules);
            //         // this.rules.push(...rs);
            //         this.rules.push(Rules);
            //     }
            // }

            // this.info = await _consul.agent.self();
            this._consul = _consul;
            this.agent = new ConsulAgent(this, _consul.agent);
            this.token = token;
            this._isConnected = true;
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
        this._onDidChangeTreeData.fire();
        // this._onDidChangeServiceTreeData.fire();
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
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to get KV pairs: ${error}`);
            return [];
        }
    }

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
                this.refresh();
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
                this.refresh();
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
    public async read_token(id: string): Promise<TokenResult> {
        this.check();
        return this._consul!.acl.token.read(id);
    }
    public async update_token(id: string, data: TokenUpdateOptions): Promise<UpdateResult> {
        this.check();
        return this._consul!.acl.token.update(id, data);
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
    public async read_role(id: string): Promise<Role> {
        this.check();
        return this._consul!.acl.role.read(id);
    }
    public async update_role(id: string, role: Role): Promise<Role> {
        this.check();
        return this._consul!.acl.role.update(id, role);
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
