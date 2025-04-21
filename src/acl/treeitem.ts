import * as vscode from 'vscode';
import ConsulProvider from '../providers/consulProvider';
import { BasicTreeItem } from '../common';
import { ConsulTreeItem } from '../providers/treeDataProvider';
import PolicyTreeItem from './policy/treeitem';


class CTreeItem extends BasicTreeItem {
    constructor(
        public readonly label: string,
        public readonly key: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly provider: ConsulProvider | undefined,
        public readonly children?: CTreeItem[]
    ) {
        super(label, collapsibleState);
        this.description = '';
    }
    public async getChildren(): Promise<ConsulTreeItem[]> {
        return [
            new PolicyTreeItem('Policy', 'policy', vscode.TreeItemCollapsibleState.Collapsed, 'root', this.provider),
        ]
    }
    static rootItem(provider: ConsulProvider | undefined): CTreeItem {
        return new CTreeItem('ACL', 'acl', vscode.TreeItemCollapsibleState.Collapsed, 'root', provider);
    }
}

export default CTreeItem;
