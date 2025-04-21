import vscode from 'vscode';
import { BasicTreeItem } from "../common";
import ConsulProvider from "../providers/consulProvider";
import { ConsulTreeItem } from '../providers/treeDataProvider';

export interface ConsulTreeNode {
    isLeaf?: boolean;
    [key: string]: ConsulTreeNode | boolean | string | undefined;
}
export default class CTreeItem extends BasicTreeItem {
    constructor(
        public readonly label: string,
        public readonly key: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly provider: ConsulProvider | undefined,
        public readonly children?: CTreeItem[]
    ) {
        super(label, collapsibleState);
        this.tooltip = `${key}`;
        this.description = '';

        if (this.contextValue === 'kvLeaf') {
            this.command = {
                command: 'consul.openKVEditor',
                title: 'Edit KV',
                arguments: [this]
            };
        }
        if (this.contextValue === 'kvRoot') {
            this.iconPath = new vscode.ThemeIcon('repo');
        } else if (this.contextValue === 'kvLeaf') {
            this.iconPath = new vscode.ThemeIcon('gist');
        } else {
            this.iconPath = new vscode.ThemeIcon('folder');
        }
    }
    buildURI(): vscode.Uri {
        const scheme = 'consul-kv';
        return vscode.Uri.parse(`${scheme}:/${this.key}`).with({ scheme });
    }
    public async getChildren(): Promise<ConsulTreeItem[]> {
        if (this.contextValue === 'kvRoot' && this.provider && this.provider.isConnected) {
            const items = await this.provider.getKVTree();
            return this.buildKVTree(items)
        }

        return this.children || []
    }

    public buildKVTree(items: string[]): CTreeItem[] {
        const root: { [key: string]: any } = {};
        for (const item of items) {
            const parts: string[] = item.split('/');
            let current = root;
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (i === parts.length - 1) {
                    current[part] = {
                        isLeaf: true,
                        key: item
                    };
                } else {
                    current[part] = current[part] || {};
                    current = current[part];
                }
            }
        }

        return this.convertToTreeItems(root, '');
    }
    public convertToTreeItems(node: ConsulTreeNode, path: string = ''): CTreeItem[] {
        return Object.entries(node).map(([name, value]) => {
            const currentPath = path ? `${path}/${name}` : name;
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                if (value.isLeaf) {
                    return new CTreeItem(
                        name,
                        currentPath,
                        vscode.TreeItemCollapsibleState.None,
                        'kvLeaf',
                        this.provider
                    );
                } else {
                    return new CTreeItem(
                        name,
                        currentPath,
                        vscode.TreeItemCollapsibleState.Collapsed,
                        'kvFolder',
                        this.provider,
                        this.convertToTreeItems(value as ConsulTreeNode, currentPath)
                    );
                }
            }
            throw new Error(`Unexpected value type for key ${name}`);
        });
    }
    static parseKey(uri: vscode.Uri): string {
        return uri.path.replace(/^\//, '');
    }
    static rootItem(provider: ConsulProvider | undefined): CTreeItem {
        return new CTreeItem('Key/Value', '', vscode.TreeItemCollapsibleState.Collapsed, 'kvRoot', provider);
    }
}