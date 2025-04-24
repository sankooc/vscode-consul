import { ConsulTreeDataProvider } from '../../providers/treeDataProvider';
import LoclTreeItem from './treeitem';
import vscode from 'vscode';
import ConsulProvider from '../../providers/consulProvider';
import { ConsulFileSystemProvider } from '../../common';
interface PolicyCache {
    name: string;
    size: number;
    permissions?: number;
}

class PolicyFSProvider extends ConsulFileSystemProvider<PolicyCache> {
    async _read(provider: ConsulProvider, id: string): Promise<[string, PolicyCache]> {
        const rs = await provider.read_policy(id);
        const _text = rs.Rules || '';
        const size = _text.length;
        const _c: PolicyCache = { name: rs.Name, size };
        if (LoclTreeItem.isBuildinId(id)) {
            _c.permissions = vscode.FilePermission.Readonly;
        }
        return [_text, _c];
    }

    async _update(provider: ConsulProvider, id: string, value: string, cache: PolicyCache): Promise<boolean> {
        await provider.update_policy(id, { Name: cache.name, Rules: value });
        return true;
    }

    async _delete(provider: ConsulProvider, id: string): Promise<boolean> {
        await provider.del_policy(id);
        this.cProvider.refresh();
        return true;
    }
}

export default (context: vscode.ExtensionContext, cProvider: ConsulTreeDataProvider): vscode.Disposable[] => {
    const pfsp = new PolicyFSProvider(cProvider);
    const registration = vscode.workspace.registerFileSystemProvider(LoclTreeItem.scheme, pfsp, {
        isCaseSensitive: true,
        isReadonly: false,
    });

    const add = vscode.commands.registerCommand('consul.acl.policy.add', async (item: LoclTreeItem) => {
        const handleMessage = async (panel: vscode.WebviewPanel, message: { command: string; data: any }) => {
            switch (message.command) {
                case 'save':
                    try {
                        const { name, description } = message.data;
                        await item.provider?.add_policy({
                            Name: name,
                            Description: description,
                        });
                        vscode.window.showInformationMessage(`Successfully added policy: ${name}`);
                        panel.dispose();
                        cProvider.refresh();
                    } catch (error) {
                        vscode.window.showErrorMessage(`Failed to add policy: ${error}`);
                    }
                    break;
                case 'cancel':
                    panel.dispose();
                    break;
            }
        };
        const opt = {
            viewType: 'addPolicy',
            title: 'Add ACL Policy',
            template: 'policy',
            key: 'create',
            handleMessage,
            data: {},
        };
        cProvider.view.render(opt);
    });

    const del = vscode.commands.registerCommand('consul.acl.policy.del', async (item: LoclTreeItem) => {
        try {
            const answer = await vscode.window.showWarningMessage(`Are you sure you want to delete policy '${item.key}'?`, { modal: true }, 'Yes');

            if (answer !== 'Yes') {
                return;
            }
            const uri = item.buildURI();
            const documents = vscode.workspace.textDocuments;
            for (const doc of documents) {
                if (doc.uri.toString() === uri.toString()) {
                    await vscode.window.showTextDocument(doc, { preview: false });
                    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
                }
            }
            pfsp.delete(uri);
            vscode.window.showInformationMessage(`Successfully deleted policy`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to delete: ${error}`);
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

    return [add, del, view, registration];
};
