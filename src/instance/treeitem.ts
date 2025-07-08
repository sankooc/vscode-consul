import vscode from 'vscode';
import { BasicTreeItem } from '../common';
import ConsulProvider from '../providers/consulProvider';
import { ConsulTreeItem } from '../providers/treeDataProvider';
import KVTreeItem from '../kv/treeitem';
import ACLTreeItem from '../acl/treeitem';
import CatalogTreeItem from '../catelog/treeitem';
import AgentTreeItem from '../agent/treeitem';

export default class CTreeItem extends BasicTreeItem {
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
    public async getChildren(): Promise<ConsulTreeItem[]> {
        if (!this.isConnected) {
            return [];
        }
        const items = [];
        if (await this.provider.checkPermission('acl')) { items.push(ACLTreeItem.rootItem(this.provider)); }
        if (await this.provider.checkPermission('kv')) { items.push(KVTreeItem.rootItem(this.provider)); }
        if (await this.provider.checkPermission('agent')) { items.push(AgentTreeItem.rootItem(this.provider)); }
        if (await this.provider.checkPermission('catalog')) { items.push(CatalogTreeItem.rootItem(this.provider)); }
        return items;
    }
}
