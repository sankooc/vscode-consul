import { ConsulOptions } from "consul/lib/consul";
import { ConsulTreeDataProvider } from "../../providers/treeDataProvider";
import LoclTreeItem from './treeitem';
import vscode from 'vscode';
import Consul from "consul";
import ConsulProvider from "../../providers/consulProvider";
import { url } from "inspector";
import { ConsulFileSystemProvider } from "../../common";


export default (context: vscode.ExtensionContext, cProvider: ConsulTreeDataProvider): vscode.Disposable[] => {

    interface PolicyCache {
        name: string,
        size: number,
        permissions?: number
    }
    class PolicyFSProvider extends ConsulFileSystemProvider<PolicyCache> {
        async _read(provider: ConsulProvider, id: string): Promise<[string, PolicyCache]> {
            const rs = await provider.read_policy(id);
            const _text = rs.Rules || '';
            const size = _text.length;
            const _c: PolicyCache = { name: rs.Name, size };
            if (id === '00000000-0000-0000-0000-000000000001' || id === '00000000-0000-0000-0000-000000000002') {
                _c.permissions = vscode.FilePermission.Readonly;
            }
            return [_text, _c];
        }
        async _update(provider: ConsulProvider, id: string, value: string, cache: PolicyCache ): Promise<boolean> {
            await provider.update_policy(id, { Name: cache.name, Rules: value });
            return true;
        }
    }

    const registration = vscode.workspace.registerFileSystemProvider(LoclTreeItem.scheme, new PolicyFSProvider(cProvider), {
        isCaseSensitive: true,
        isReadonly: false
    });
    context.subscriptions.push(registration);

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
    const detail = vscode.commands.registerCommand('consul.acl.policy.editDetail', async (item: LoclTreeItem) => {
        // try {
        //     await item.provider?.add_policy({ Name: name! });
        //     vscode.window.showInformationMessage(`Successfully added : ${name}`);
        // } catch (error) {
        //     vscode.window.showErrorMessage(`Failed to add: ${error}`);
        // }
    });

    const del = vscode.commands.registerCommand('consul.acl.policy.del', async (item: LoclTreeItem) => {
        try {
            const id = item.key;
            if (id) {
                await item.provider?.del_policy(id);
                vscode.window.showInformationMessage(`Successfully del : ${id}`);

            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to del: ${error}`);
        }
    });

    const view = vscode.commands.registerCommand('consul.acl.policy.edit', async (item: LoclTreeItem) => {
        try {
            const id = item.key;
            if (id) {
                const uri = item.buildURI();
                const document = await vscode.workspace.openTextDocument(uri);
                await vscode.window.showTextDocument(document);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to view: ${error}`);
        }
    });
    return [add, del, view];
};