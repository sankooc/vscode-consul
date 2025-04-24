import * as vscode from 'vscode';
import ConsulProvider from '../../providers/consulProvider';
import { BasicTreeItem } from '../../common';
import { ConsulTreeItem } from '../../providers/treeDataProvider';

class CTreeItem extends BasicTreeItem {
    public methodName?: string;
    constructor(
        public readonly label: string,
        public readonly key: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly provider: ConsulProvider | undefined
    ) {
        super(label, collapsibleState);
        this.description = '';
    }
    async getChildren(): Promise<ConsulTreeItem[]> {
        switch (this.contextValue) {
            case 'root':
                // return ((await this.provider?.list_method()) || []).map((item: Method) => {
                //     return new CTreeItem(
                //         item.Name,
                //         item.Name,
                //         vscode.TreeItemCollapsibleState.None,
                //         'leaf',
                //         this.provider
                //     );
                // });
                return [];
            default:
                return [];
        }
    }
}

export default CTreeItem;
