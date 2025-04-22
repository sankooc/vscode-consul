import * as vscode from 'vscode';
import ConsulProvider from '../../providers/consulProvider';
import { BasicTreeItem } from '../../common';
import { ConsulTreeItem } from '../../providers/treeDataProvider';
import { TemplatedPolicy } from 'consul/lib/acl/templatedPolicy';

class CTreeItem extends BasicTreeItem {
    public static readonly ROOT = 'tp_root';
    public static readonly LEAF = 'tp_leaf';
    constructor(
        public readonly label: string,
        public readonly key: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly provider: ConsulProvider | undefined,
    ) {
        super(label, collapsibleState);
        switch (this.contextValue) {
            case CTreeItem.ROOT:
                this.iconPath = new vscode.ThemeIcon('notebook-template');
                break;
            default:
                this.iconPath = new vscode.ThemeIcon('notebook');
        }
    }
    async getChildren(): Promise<ConsulTreeItem[]> {
        switch (this.contextValue) {
            case 'root':
                return [];
            default:
                return [];
        }
    }
}

export default CTreeItem;
