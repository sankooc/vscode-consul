import { ConsulTreeDataProvider } from "../../providers/treeDataProvider";
import LoclTreeItem from './treeitem';
import vscode from 'vscode';

export default (context: vscode.ExtensionContext, provider: ConsulTreeDataProvider): vscode.Disposable[] => {
    const namecheck = (description: string | undefined) => {
        return !!description;
    };
    const prompt = 'Enter a description for the ACL Token';
    return [];

    // const add = vscode.commands.registerCommand('consul.acl.token.add', async (item: LoclTreeItem) => {
    //     const description = await vscode.window.showInputBox({ prompt });

    //     if (namecheck(description)) {
    //         try {
    //             // await item.provider?.add_token({ Description: description! });
    //             vscode.window.showInformationMessage(`Successfully added token: ${description}`);
    //         } catch (error) {
    //             vscode.window.showErrorMessage(`Failed to add token: ${error}`);
    //         }
    //     }
    // });

    // const del = vscode.commands.registerCommand('consul.acl.token.del', async (item: LoclTreeItem) => {
    //     try {
    //         const id = item.tokenId;
    //         if (id) {
    //             // await item.provider?.del_token(id);
    //             vscode.window.showInformationMessage(`Successfully deleted token: ${id}`);
    //         }
    //     } catch (error) {
    //         vscode.window.showErrorMessage(`Failed to delete token: ${error}`);
    //     }
    // });

    // return [add, del];
};
