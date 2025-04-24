import { buildRawDataURI } from '../../common';
import { ConsulTreeDataProvider } from '../../providers/treeDataProvider';
import LoclTreeItem from './treeitem';
import vscode from 'vscode';

export default (context: vscode.ExtensionContext, provider: ConsulTreeDataProvider): vscode.Disposable[] => {
    const schema = vscode.commands.registerCommand('consul.acl.templatedPolicy.view.schema', async (item: LoclTreeItem) => {
        if (item.item) {
            const data = item.item;
            const _text = data.Schema;
            if (_text) {
                const uri = buildRawDataURI(`${data.TemplateName}-schema`, 'json', _text);
                const doc = await vscode.workspace.openTextDocument(uri);
                await vscode.window.showTextDocument(doc);
            }
        }
    });
    const template = vscode.commands.registerCommand('consul.acl.templatedPolicy.view.template', async (item: LoclTreeItem) => {
        if (item.item) {
            const data = item.item;
            const _text = data.Template;
            if (_text) {
                const uri = buildRawDataURI(`${data.TemplateName}-temp`, 'plain', _text);
                const doc = await vscode.workspace.openTextDocument(uri);
                await vscode.window.showTextDocument(doc);
            }
        }
    });
    return [schema, template];

    // const add = vscode.commands.registerCommand('consul.acl.templatedPolicy.add', async (item: LoclTreeItem) => {
    //     const name = await vscode.window.showInputBox({ prompt });

    //     if (namecheck(name)) {
    //         try {
    //             await item.provider?.add_templated_policy({
    //                 Name: name!,
    //                 Template: true
    //             });
    //             vscode.window.showInformationMessage(`Successfully added templated policy: ${name}`);
    //         } catch (error) {
    //             vscode.window.showErrorMessage(`Failed to add templated policy: ${error}`);
    //         }
    //     }
    // });

    // const del = vscode.commands.registerCommand('consul.acl.templatedPolicy.del', async (item: LoclTreeItem) => {
    //     try {
    //         const id = item.policyId;
    //         if (id) {
    //             await item.provider?.del_templated_policy(id);
    //             vscode.window.showInformationMessage(`Successfully deleted templated policy: ${id}`);
    //         }
    //     } catch (error) {
    //         vscode.window.showErrorMessage(`Failed to delete templated policy: ${error}`);
    //     }
    // });

    // return [add, del];
};
