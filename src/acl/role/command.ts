import { ConsulTreeDataProvider } from "../../providers/treeDataProvider";
import LoclTreeItem from './treeitem';
import vscode from 'vscode';

export default (context: vscode.ExtensionContext, provider: ConsulTreeDataProvider): vscode.Disposable[] => {
    
    const add = vscode.commands.registerCommand('consul.acl.role.add', async (item: LoclTreeItem) => {
        // TODO
    });
    return [add];

    // const del = vscode.commands.registerCommand('consul.acl.role.del', async (item: LoclTreeItem) => {
    //     try {
    //         const id = item.roleId;
    //         if (id) {
    //             await item.provider?.del_role(id);
    //             vscode.window.showInformationMessage(`Successfully deleted role: ${id}`);
    //         }
    //     } catch (error) {
    //         vscode.window.showErrorMessage(`Failed to delete role: ${error}`);
    //     }
    // });

    // return [add, del];
};
