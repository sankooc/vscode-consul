import * as vscode from 'vscode';
import ConsulProvider from '../../providers/consulProvider';
import { BasicTreeItem } from '../../common';
import { ConsulTreeItem } from '../../providers/treeDataProvider';
import { TokenResult } from 'consul/lib/acl/token';

class CTreeItem extends BasicTreeItem {
    public static ROOT = 'token_root';
    public static LEAF_BUILDIN = 'token_leaf_buildin';
    public static LEAF = 'token_leaf';
    public SecretID?: string;
    constructor(
        public readonly label: string,
        public readonly key: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly provider: ConsulProvider | undefined
    ) {
        super(label, collapsibleState);
        this.description = '';

        switch (this.contextValue) {
            case CTreeItem.ROOT:
                this.iconPath = new vscode.ThemeIcon('briefcase');
                break;
            case CTreeItem.LEAF:
                this.iconPath = new vscode.ThemeIcon('key');
                this.command = {
                    command: 'consul.acl.token.edit',
                    title: 'Edit Token',
                    arguments: [this],
                };
                break;
            case CTreeItem.LEAF_BUILDIN:
                this.iconPath = new vscode.ThemeIcon('key');
                break;
            default:
                this.iconPath = new vscode.ThemeIcon('key');
        }
    }
    child(item: TokenResult): ConsulTreeItem {
        const id = item.AccessorID;
        let contextValue = CTreeItem.LEAF;
        if (id === '00000000-0000-0000-0000-000000000002') {
            contextValue = CTreeItem.LEAF_BUILDIN;
        }
        const name = id.length > 8 ? id.substring(id.length - 8) : id;
        const it = new CTreeItem(name, id, vscode.TreeItemCollapsibleState.None, contextValue, this.provider);
        it.SecretID = item.SecretID;
        it.description = item.Description;
        return it;
    }
    async getChildren(): Promise<ConsulTreeItem[]> {
        switch (this.contextValue) {
            case CTreeItem.ROOT: {
                const items = await this.provider!.list_token();
                return items.map(this.child.bind(this));
            }
            default:
                return [];
        }
    }
}

export default CTreeItem;
