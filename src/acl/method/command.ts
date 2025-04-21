import { ConsulTreeDataProvider } from "../../providers/treeDataProvider";
import LoclTreeItem from './treeitem';
import vscode from 'vscode';

export default (context: vscode.ExtensionContext, provider: ConsulTreeDataProvider): vscode.Disposable[] => {
    const namecheck = (name: string | undefined) => {
        return !!name;
    };
    const prompt = 'Enter a name for the ACL Auth Method';
    return [];
    // const add = vscode.commands.registerCommand('consul.acl.method.add', async (item: LoclTreeItem) => {
    //     const name = await vscode.window.showInputBox({ prompt });

    //     if (namecheck(name)) {
    //         try {
    //             await item.provider?.add_method({ Name: name!, Type: 'jwt' });
    //             vscode.window.showInformationMessage(`Successfully added auth method: ${name}`);
    //         } catch (error) {
    //             vscode.window.showErrorMessage(`Failed to add auth method: ${error}`);
    //         }
    //     }
    // });

    // const del = vscode.commands.registerCommand('consul.acl.method.del', async (item: LoclTreeItem) => {
    //     try {
    //         const name = item.methodName;
    //         if (name) {
    //             await item.provider?.del_method(name);
    //             vscode.window.showInformationMessage(`Successfully deleted auth method: ${name}`);
    //         }
    //     } catch (error) {
    //         vscode.window.showErrorMessage(`Failed to delete auth method: ${error}`);
    //     }
    // });

    // return [add, del];
};
