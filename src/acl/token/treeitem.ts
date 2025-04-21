import * as vscode from 'vscode';
import ConsulProvider from '../../providers/consulProvider';
import { BasicTreeItem } from '../../common';
import { ConsulTreeItem } from '../../providers/treeDataProvider';

class CTreeItem extends BasicTreeItem {
    public tokenId?: string;
    constructor(
        public readonly label: string,
        public readonly key: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly provider: ConsulProvider | undefined,
    ) {
        super(label, collapsibleState);
        this.description = '';
        this.iconPath = new vscode.ThemeIcon('key');
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
