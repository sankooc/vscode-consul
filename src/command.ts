import vscode from 'vscode';
import { ConsulTreeDataProvider } from './providers/treeDataProvider';
import instanceBuild from './instance/command';
import kvBuild from './kv/command';
import catalogBuild from './catelog/command';
import policy from './acl/policy/command';


export const build = (context: vscode.ExtensionContext, consulTreeProvider: ConsulTreeDataProvider): vscode.Disposable[] => {
    return [
        ...instanceBuild(context, consulTreeProvider),
        ...kvBuild(context, consulTreeProvider),
        ...catalogBuild(context, consulTreeProvider),
        ...policy(context, consulTreeProvider)
    ];
};