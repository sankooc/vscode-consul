import { ConsulOptions } from "consul/lib/consul";
import { ConsulTreeDataProvider } from "../../providers/treeDataProvider";
import LoclTreeItem from './treeitem';
import vscode from 'vscode';
import Consul from "consul";


export default (context: vscode.ExtensionContext, provider: ConsulTreeDataProvider): vscode.Disposable[] => {

    const namecheck = (name: string | undefined) => {
        return !!name;
    };
    const prompt = 'Enter a name for the ACL Policy';
    const add = vscode.commands.registerCommand('consul.acl.policy.add', async (item: LoclTreeItem) => {
        const name = await vscode.window.showInputBox({ prompt });

        if (namecheck(name)) {
            try {
                await item.provider?.add_policy({ Name: name! });
                vscode.window.showInformationMessage(`Successfully added : ${name}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to add: ${error}`);
            }
        }
    });

    const del = vscode.commands.registerCommand('consul.acl.policy.del', async (item: LoclTreeItem) => {
        try {
            const id = item.policyId;
            if (id) {
                await item.provider?.del_policy(id);
                vscode.window.showInformationMessage(`Successfully del : ${id}`);

            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to del: ${error}`);
        }
    });

    // const list = vscode.commands.registerCommand('consul.removeInstance', async (item: LoclTreeItem) => {
    //     try {
    //         const id = item.policyId;
    //         if (id) {
    //             // await item.provider?
    //             vscode.window.showInformationMessage(`Successfully del : ${id}`);

    //         }
    //     } catch (error) {
    //         vscode.window.showErrorMessage(`Failed to del: ${error}`);
    //     }
    // });

    // const refreshCommand = vscode.commands.registerCommand('consul.refresh', () => {
    //     provider.refresh();
    // });

    return [add, del];
};