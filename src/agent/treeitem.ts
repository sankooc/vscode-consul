import * as vscode from 'vscode';
import ConsulProvider from '../providers/consulProvider';
import { BasicTreeItem, loc, NodeType } from '../common';
import { ConsulTreeItem } from '../providers/treeDataProvider';
import ServiceTreeItem from './service/treeitem';

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
        this.iconPath = new vscode.ThemeIcon('inbox');
        //gist-secret
    }
    public async getChildren(): Promise<ConsulTreeItem[]> {
        return [new ServiceTreeItem(loc('Service'), 'Service', vscode.TreeItemCollapsibleState.Collapsed, NodeType.ROOT, this.provider)];
    }
    static rootItem(provider: ConsulProvider | undefined): CTreeItem {
        return new CTreeItem(loc('AGENT'), 'agent', vscode.TreeItemCollapsibleState.Collapsed, '_agent', provider);
    }
}

export default CTreeItem;
