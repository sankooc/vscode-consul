import * as vscode from 'vscode';
import ConsulProvider from '../providers/consulProvider';
import { BasicTreeItem } from '../common';
import { ConsulTreeItem } from '../providers/treeDataProvider';
import PolicyTreeItem from './policy/treeitem';
import RoleTreeItem from './role/treeitem';
import TokenTreeItem from './token/treeitem';
import MethodTreeItem from './method/treeitem';
import RuleTreeItem from './rule/treeitem';
import TemplatedPolicyTreeItem from './templatedPolicy/treeitem';

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
        this.iconPath = new vscode.ThemeIcon('gist-secret');
        //gist-secret
    }
    public async getChildren(): Promise<ConsulTreeItem[]> {
        return [
            new PolicyTreeItem('Policy', 'policy', vscode.TreeItemCollapsibleState.Collapsed, 'policy_root', this.provider),
            new TokenTreeItem('Token', 'token', vscode.TreeItemCollapsibleState.Collapsed, 'token_root', this.provider),
            new RoleTreeItem('Role', 'role', vscode.TreeItemCollapsibleState.Collapsed, 'role_root', this.provider),
            new TemplatedPolicyTreeItem('Templated Policy', 'templatedPolicy', vscode.TreeItemCollapsibleState.Collapsed, 'tp_root', this.provider),
            new MethodTreeItem('Auth Method', 'method', vscode.TreeItemCollapsibleState.Collapsed, 'method_root', this.provider),
            new RuleTreeItem('Binding Rule', 'brule', vscode.TreeItemCollapsibleState.Collapsed, 'rule_root', this.provider),
        ]
    }
    static rootItem(provider: ConsulProvider | undefined): CTreeItem {
        return new CTreeItem('ACL', 'acl', vscode.TreeItemCollapsibleState.Collapsed, 'root', provider);
    }
}

export default CTreeItem;
