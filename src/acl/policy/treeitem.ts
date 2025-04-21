import * as vscode from 'vscode';
import ConsulProvider from '../../providers/consulProvider';
import { BasicTreeItem } from '../../common';
import { ConsulTreeItem } from '../../providers/treeDataProvider';
import { PolicyResult } from 'consul/lib/acl/policy';


class CTreeItem extends BasicTreeItem {
    public policyId?: string;
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
    static rootItem(provider: ConsulProvider | undefined): CTreeItem {
        return new CTreeItem('Policy', '', vscode.TreeItemCollapsibleState.Collapsed, 'root', provider);
    }
    async getChildren(): Promise<ConsulTreeItem[]> {
        switch (this.contextValue) {
            case 'root':
                return ((await this.provider?.list_policy()) || []).map((item: PolicyResult) => {
                    return new CTreeItem(
                        item.Name,
                        item.ID!,
                        vscode.TreeItemCollapsibleState.None,
                        'leaf',
                        this.provider
                    );
                });
            default:
                return [];
        }
    }
}

export default CTreeItem;
