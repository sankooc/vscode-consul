import * as vscode from 'vscode';
import ConsulProvider from '../../providers/consulProvider';
import { BasicTreeItem } from '../../common';
import { ConsulTreeItem } from '../../providers/treeDataProvider';
import { BindingRule } from 'consul/lib/acl/rule';

class CTreeItem extends BasicTreeItem {
    public ruleId?: string;
    constructor(
        public readonly label: string,
        public readonly key: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly provider: ConsulProvider | undefined,
    ) {
        super(label, collapsibleState);
        this.description = '';
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
