import * as vscode from 'vscode';
import ConsulProvider from '../../providers/consulProvider';
import { BasicTreeItem } from '../../common';
import { ConsulTreeItem } from '../../providers/treeDataProvider';
import { TemplatedPolicy } from 'consul/lib/acl/templatedPolicy';

class CTreeItem extends BasicTreeItem {
    public static readonly ROOT = 'tp_root';
    public static readonly LEAF = 'tp_leaf';
    public item?: TemplatedPolicy;
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
                this.iconPath = new vscode.ThemeIcon('notebook-template');
                break;
            default:
                this.iconPath = new vscode.ThemeIcon('notebook');
        }
    }
    child(item: TemplatedPolicy): CTreeItem {
        const it = new CTreeItem(item.TemplateName, item.TemplateName, vscode.TreeItemCollapsibleState.None, CTreeItem.LEAF, this.provider);
        it.description = item.Description;
        it.item = item;
        return it;
    }
    async getChildren(): Promise<ConsulTreeItem[]> {
        switch (this.contextValue) {
            case CTreeItem.ROOT:
                const items = await this.provider?.list_template_policy();
                return (items || []).map(this.child.bind(this));
            default:
                return [];
        }
    }
}

export default CTreeItem;
