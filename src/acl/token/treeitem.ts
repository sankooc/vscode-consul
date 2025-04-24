import * as vscode from 'vscode';
import ConsulProvider from '../../providers/consulProvider';
import { BasicTreeItem } from '../../common';
import { ConsulTreeItem } from '../../providers/treeDataProvider';
import { TokenResult } from 'consul/lib/acl/token';

class CTreeItem extends BasicTreeItem {
    public static ROOT = 'token_root';
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
            default:
                this.iconPath = new vscode.ThemeIcon('key');
        }
    }
    async getChildren(): Promise<ConsulTreeItem[]> {
        switch (this.contextValue) {
            case CTreeItem.ROOT:
                {
                    const items = await this.provider!.list_token();
                    return items.map((item: TokenResult) => {
                        const id = item.AccessorID;
                        const name = id.length > 8 ? id.substring(id.length - 8) : id;
                        const it = new CTreeItem(name, id, vscode.TreeItemCollapsibleState.None, CTreeItem.LEAF, this.provider);
                        it.SecretID = item.SecretID;
                        it.description = item.Description;
                        return it;
                    });
                }
                return [];
            default:
                return [];
        }
    }
}

export default CTreeItem;
