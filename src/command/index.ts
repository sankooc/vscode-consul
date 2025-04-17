import vscode from 'vscode';
import { ConsulTreeDataProvider } from '../providers/treeDataProvider';
import { build as instanceBuild } from './instance';
import { build as kvBuild } from './kv';
import { build as catalogBuild } from './catalog';


export const build = (context: vscode.ExtensionContext, consulTreeProvider: ConsulTreeDataProvider): vscode.Disposable[] => {
    return [...instanceBuild(context, consulTreeProvider),...kvBuild(context, consulTreeProvider), ...catalogBuild(context, consulTreeProvider) ];
};