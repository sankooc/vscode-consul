import vscode from 'vscode';
import { ServiceInfo } from 'consul/lib/agent/service';
import { CommonTreeItem, NodeType } from '../../common';

export default class CTreeItem extends CommonTreeItem<ServiceInfo> {
    getIconId(node: NodeType): string {
        switch (node) {
            case NodeType.ROOT:
                return 'globe';
            default:
                return 'radio-tower';
        }
    }
    getContextValue(node: NodeType): string {
        switch (node) {
            case NodeType.ROOT:
                return 'serviceRoot';
            default:
                return 'serviceLeaf';
        }
    }
    getCommandArgs(): string[] | undefined {
        return ['service config', ''];
    }
    child(item: ServiceInfo): CommonTreeItem<ServiceInfo> {
        const it = new CTreeItem(item.Service, item.ID, vscode.TreeItemCollapsibleState.None, NodeType.LEAF, this.provider);
        return it;
    }
    async children(): Promise<ServiceInfo[]> {
        return await this.provider!.agent!.listService();
    }

}