import { ConsulTreeDataProvider } from "../../providers/treeDataProvider";
import LoclTreeItem from './treeitem';
import vscode from 'vscode';

export default (context: vscode.ExtensionContext, provider: ConsulTreeDataProvider): vscode.Disposable[] => {
    const namecheck = (description: string | undefined) => {
        return !!description;
    };
    const prompt = 'Enter a description for the ACL Binding Rule';
    return [];

    // const add = vscode.commands.registerCommand('consul.acl.rule.add', async (item: LoclTreeItem) => {
    //     const description = await vscode.window.showInputBox({ prompt });

    //     if (namecheck(description)) {
    //         try {
    //             await item.provider?.add_binding_rule({
    //                 Description: description!,
    //                 AuthMethod: 'jwt',
    //                 BindType: 'service',
    //                 BindName: 'default'
    //             });
    //             vscode.window.showInformationMessage(`Successfully added binding rule: ${description}`);
    //         } catch (error) {
    //             vscode.window.showErrorMessage(`Failed to add binding rule: ${error}`);
    //         }
    //     }
    // });

    // const del = vscode.commands.registerCommand('consul.acl.rule.del', async (item: LoclTreeItem) => {
    //     try {
    //         const id = item.ruleId;
    //         if (id) {
    //             await item.provider?.del_binding_rule(id);
    //             vscode.window.showInformationMessage(`Successfully deleted binding rule: ${id}`);
    //         }
    //     } catch (error) {
    //         vscode.window.showErrorMessage(`Failed to delete binding rule: ${error}`);
    //     }
    // });

    // return [add, del];
};
