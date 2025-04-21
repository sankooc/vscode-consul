import * as vscode from 'vscode';
import ConsulProvider from '../../providers/consulProvider';
import { BasicTreeItem } from '../../common';
import { ConsulTreeItem } from '../../providers/treeDataProvider';
import { PolicyResult } from 'consul/lib/acl/policy';


class CTreeItem extends BasicTreeItem {
    // public policyId?: string;
    public static readonly scheme = 'consul-policy';
    constructor(
        public readonly label: string,
        public readonly key: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly provider: ConsulProvider | undefined,
    ) {
        super(label, collapsibleState);
        this.description = '';
        switch (this.contextValue) {
            case 'policy_root':
                this.iconPath = new vscode.ThemeIcon('filter');
                break;
            default:
                this.iconPath = new vscode.ThemeIcon('code');
                this.command = {
                    command: 'consul.acl.policy.edit',
                    title: 'Edit',
                    arguments: [this]
                };
        }
    }
    async getChildren(): Promise<ConsulTreeItem[]> {
        switch (this.contextValue) {
            case 'policy_root':
                return ((await this.provider?.list_policy()) || []).map((item: PolicyResult) => {
                    const ct =  new CTreeItem(
                        item.Name,
                        item.ID!,
                        vscode.TreeItemCollapsibleState.None,
                        'policy_leaf',
                        this.provider
                    );
                    ct.description = item.Description;
                    return ct;
                });
            default:
                return [];
        }
    }
    buildURI(): vscode.Uri {
        const url = `${this.provider?.getLabel()}/${this.key}`;
        return vscode.Uri.parse(`${CTreeItem.scheme}:/${url}`).with({ scheme: CTreeItem.scheme });
    }
}

export default CTreeItem;
