import { ConsulTreeDataProvider } from '../providers/treeDataProvider';
import vscode from 'vscode';

import agentCommand from './service/command';

export default (context: vscode.ExtensionContext, consulTreeProvider: ConsulTreeDataProvider): vscode.Disposable[] => {
    // const edit = vscode.commands.registerCommand('consul.service.view', async (item: CatalogTreeItem) => {
    // });
    return [...agentCommand(context, consulTreeProvider)];
};
