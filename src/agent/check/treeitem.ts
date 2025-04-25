import vscode from 'vscode';
import { Check } from 'consul/lib/agent/check';
import { CommonTreeItem, NodeType } from '../../common';

export default class CTreeItem extends CommonTreeItem<Check> {
    public _item?: Check;
    getIconId(node: NodeType): string {
        switch (node) {
            case NodeType.ROOT:
                return 'checklist';
            default:
                return 'check';
        }
    }
    getContextValue(node: NodeType): string {
        switch (node) {
            case NodeType.ROOT:
                return 'checkRoot';
            default:
                return 'checkLeaf';
        }
    }
    getCommandArgs(): string[] | undefined {
        switch (this.node) {
            case NodeType.LEAF:
                return ['check config', 'consul.agent.check.view'];
            default:
                return undefined;
        }
    }
    child(item: Check): CommonTreeItem<Check> {
        const it = new CTreeItem(item.Name, item.CheckID, vscode.TreeItemCollapsibleState.None, NodeType.LEAF, this.provider);
        it.description = item.Status;
        it._item = item;
        switch (item?.Status) {
            case 'passing':
                it.iconPath = new vscode.ThemeIcon('pass', new vscode.ThemeColor('charts.green'));
                break;
            case 'critical':
                it.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('charts.red'));
                break;
            default:
                it.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('charts.yellow'));
        }
        return it;
    }
    async children(): Promise<Check[]> {
        return await this.provider!.agent!.listChecks();
    }
}
