import { ConsulTreeDataProvider } from "../../providers/treeDataProvider";
import LoclTreeItem from './treeitem';
import vscode from 'vscode';

export default (context: vscode.ExtensionContext, provider: ConsulTreeDataProvider): vscode.Disposable[] => {
    const namecheck = (name: string | undefined) => {
        return !!name;
    };
    const prompt = 'Enter a name for the ACL Role';
    return [];

    // const add = vscode.commands.registerCommand('consul.acl.role.add', async (item: LoclTreeItem) => {
    //     const name = await vscode.window.showInputBox({ prompt });

    //     if (namecheck(name)) {
    //         try {
    //             await item.provider?.add_role({ Name: name! });
    //             vscode.window.showInformationMessage(`Successfully added role: ${name}`);
    //         } catch (error) {
    //             vscode.window.showErrorMessage(`Failed to add role: ${error}`);
    //         }
    //     }
    // });

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
