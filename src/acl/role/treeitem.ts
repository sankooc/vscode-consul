import * as vscode from 'vscode';
import ConsulProvider from '../../providers/consulProvider';
import { BasicTreeItem } from '../../common';
import { ConsulTreeItem } from '../../providers/treeDataProvider';
import { Role } from 'consul/lib/acl/role';

class CTreeItem extends BasicTreeItem {
    public static readonly ROOT = 'role_root';
    public static readonly LEAF = 'role_leaf';
    constructor(
        public readonly label: string,
        public readonly key: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly provider: ConsulProvider | undefined
    ) {
        super(label, collapsibleState);
        switch (this.contextValue) {
            case CTreeItem.ROOT:
                this.iconPath = new vscode.ThemeIcon('organization');
                break;
            case CTreeItem.LEAF:
                this.iconPath = new vscode.ThemeIcon('preview');
                this.description = this.key;
                break;
            default:
                this.iconPath = new vscode.ThemeIcon('preview');
        }
    }
    async getChildren(): Promise<ConsulTreeItem[]> {
        switch (this.contextValue) {
            case CTreeItem.ROOT:
                const roles = (await this.provider?.list_role()) || [];
                return roles.map((role) => new CTreeItem(role.Name, role.ID!, vscode.TreeItemCollapsibleState.None, CTreeItem.LEAF, this.provider));
            default:
                return [];
        }
    }
}

export default CTreeItem;
