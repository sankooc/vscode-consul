import vscode from 'vscode';
import { BasicTreeItem } from "../common";
import ConsulProvider from "../providers/consulProvider";
import { ConsulTreeItem } from '../providers/treeDataProvider';


export default class CTreeItem extends BasicTreeItem {
    private static readonly contentMap: Map<string, any> = new Map();
    constructor(
        public readonly label: string,
        public readonly type: string,
        public readonly node: string,
        public readonly content: any,
        // public readonly tags: string[],
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly provider: ConsulProvider | undefined,
    ) {
        super(label, collapsibleState);
        // this.tooltip = `${label} [${tags.join(', ')}]`;
        // this.description = tags.join(', ');

        if (this.type !== 'root') {
            this.contextValue = 'catalogItemWithDetails';
        }
        switch (this.type) {
            case 'root':
                this.iconPath = new vscode.ThemeIcon('project');
                break;
            case 'node':
                this.iconPath = new vscode.ThemeIcon('device-desktop');
                this.description = this.content?.Node;
                this.tooltip = this.content?.Meta?.['consul-version'];
                break;
            default:
                this.iconPath = new vscode.ThemeIcon('symbol-function');
                break;
        }
    }


    public async getChildren(): Promise<ConsulTreeItem[]> {
        const provider = this.provider;
        if (!provider || !provider.isConnected) {
            return [];
        }
        switch (this.type) {
            case 'root':
                const list = await provider.getNodes();
                return list.map(node => {
                    // const url = vscode.Uri.parse(`${scheme}:/node/${this.node}`).with({ scheme });
                    return new CTreeItem(
                        node.Address,
                        'node',
                        node.ID,
                        node,
                        vscode.TreeItemCollapsibleState.Collapsed,
                        provider
                    );
                });
            case 'node':
                const ss = await provider.getServices(this.node);
                return ss.map(node => {
                    return new CTreeItem(
                        node.Service,
                        'service',
                        this.node,
                        node,
                        vscode.TreeItemCollapsibleState.None,
                        provider
                    );
                });

            default:
                return [];
        }
    }
    static rootItem(provider: ConsulProvider | undefined): CTreeItem {
        return new CTreeItem('Catalog', 'root', '', '', vscode.TreeItemCollapsibleState.Collapsed, provider);
    }
    public static readonly schema = 'consul-catalog';
    buildURI(): vscode.Uri {
        const scheme = CTreeItem.schema;
        return vscode.Uri.parse(`${scheme}:/raw?data=${JSON.stringify(this.content)}`).with({ scheme });
    }

}
