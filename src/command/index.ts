
import { ConsulTreeDataProvider } from '../providers/treeDataProvider';
import { build as instanceBuild } from './instance'
import { build as kvBuild } from './kv'
import vscode from 'vscode';


export const build = (context: vscode.ExtensionContext, consulTreeProvider: ConsulTreeDataProvider): vscode.Disposable[] => {
    return [...instanceBuild(context, consulTreeProvider),...kvBuild(context, consulTreeProvider) ];
};