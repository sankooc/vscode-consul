import { ConsulTreeDataProvider } from '../providers/treeDataProvider';
import vscode from 'vscode';

import agentCommand from './service/command';
import checkCommand from './check/command';

export default (context: vscode.ExtensionContext, consulTreeProvider: ConsulTreeDataProvider): vscode.Disposable[] => {
    // const view = vscode.commands.registerCommand('consul.service.view', async (item: LocTreeItem) => {
    //     const id = item.key;
    //     const provider = item.provider;
    //     if(id && provider){
    //         const content = provider.agent?.serviceConfig(id);

    //     }
    // });
    return [...agentCommand(context, consulTreeProvider), ...checkCommand(context, consulTreeProvider)];
};
