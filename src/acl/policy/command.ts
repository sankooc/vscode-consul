import { ConsulTreeDataProvider } from "../../providers/treeDataProvider";
import LoclTreeItem from './treeitem';
import vscode from 'vscode';
import ConsulProvider from "../../providers/consulProvider";
import { ConsulFileSystemProvider } from "../../common";

function getWebviewContent() {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Add ACL Policy</title>
        <style>
            body {
                padding: 20px;
                font-family: var(--vscode-font-family);
                color: var(--vscode-foreground);
                display: flex;
                justify-content: center;
            }
            .form-container {
                width: 100%;
                max-width: 500px;
            }
            .form-group {
                margin-bottom: 15px;
            }
            label {
                display: block;
                margin-bottom: 5px;
            }
            input, textarea {
                width: 100%;
                padding: 8px;
                border: 1px solid var(--vscode-input-border);
                background: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border-radius: 2px;
                box-sizing: border-box;
            }
            .button-container {
                margin-top: 20px;
                display: flex;
                gap: 10px;
            }
            button {
                padding: 8px 16px;
                border: none;
                border-radius: 2px;
                cursor: pointer;
            }
            .save-button {
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
            }
            .cancel-button {
                background: var(--vscode-button-secondary-background);
                color: var(--vscode-button-secondary-foreground);
            }
        </style>
    </head>
    <body>
        <div class="form-container">
            <form id="policyForm">
                <div class="form-group">
                    <label for="name">Name *</label>
                    <input type="text" id="name" name="name" required>
                </div>
                <div class="form-group">
                    <label for="description">Description</label>
                    <textarea id="description" name="description" rows="3"></textarea>
                </div>
                <div class="button-container">
                    <button type="submit" class="save-button">Save</button>
                    <button type="button" class="cancel-button" onclick="cancel()">Cancel</button>
                </div>
            </form>
        </div>
        <script>
            const vscode = acquireVsCodeApi();
            
            document.getElementById('policyForm').addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('name').value;
                const description = document.getElementById('description').value;
                
                vscode.postMessage({
                    command: 'save',
                    data: { name, description }
                });
            });

            function cancel() {
                vscode.postMessage({
                    command: 'cancel'
                });
            }
        </script>
    </body>
    </html>`;
}

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

    const pfsp = new PolicyFSProvider(cProvider);
    const registration = vscode.workspace.registerFileSystemProvider(LoclTreeItem.scheme, pfsp, {
        isCaseSensitive: true,
        isReadonly: false
    });
    // context.subscriptions.push(registration);

    const add = vscode.commands.registerCommand('consul.acl.policy.add', async (item: LoclTreeItem) => {
        const panel = vscode.window.createWebviewPanel(
            'addPolicy',
            'Add ACL Policy',
            vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );

        panel.webview.html = getWebviewContent();

        panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'save':
                        try {
                            const { name, description } = message.data;
                            await item.provider?.add_policy({
                                Name: name,
                                Description: description
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
            },
            undefined,
            context.subscriptions
        );
    });

    const del = vscode.commands.registerCommand('consul.acl.policy.del', async (item: LoclTreeItem) => {
        try {
            const answer = await vscode.window.showWarningMessage(
                `Are you sure you want to delete policy '${item.key}'?`,
                { modal: true },
                'Yes'
            );

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