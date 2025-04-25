import vscode from 'vscode';
import { ServiceInfo } from 'consul/lib/agent/service';
import { CommonTreeItem, NodeType } from '../../common';

export default class CTreeItem extends CommonTreeItem<ServiceInfo> {
    public _item?: ServiceInfo;
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
        switch (this.node) {
            case NodeType.LEAF:
                return ['service config', 'consul.agent.service.view'];
            default:
                return undefined;
        }
    }
    child(item: ServiceInfo): CommonTreeItem<ServiceInfo> {
        const it = new CTreeItem(item.Service, item.ID, vscode.TreeItemCollapsibleState.None, NodeType.LEAF, this.provider);
        it._item = item;
        return it;
    }
    async children(): Promise<ServiceInfo[]> {
        return await this.provider!.agent!.listService();
    }
}
