import { ConsulTreeDataProvider } from '../../providers/treeDataProvider';
import LoclTreeItem from './treeitem';
import vscode from 'vscode';
import { upperObj } from '../../common';

export default (context: vscode.ExtensionContext, provider: ConsulTreeDataProvider): vscode.Disposable[] => {
    const add = vscode.commands.registerCommand('consul.acl.token.add', async (item: LoclTreeItem) => {
        const policies = (await item.provider?.list_policy()) || [];
        const roles = (await item.provider?.list_role()) || [];
        const handleMessage = async (panel: vscode.WebviewPanel, message: { command: string; data: any }) => {
            switch (message.command) {
                case 'save':
                    try {
                        const data = message.data;
                        const opt = upperObj(data);
                        await item.provider?.add_token(opt);
                        vscode.window.showInformationMessage('Successfully added token');
                        panel.dispose();
                        provider.refresh();
                    } catch (error) {
                        vscode.window.showErrorMessage(`Failed to add token: ${error}`);
                    }
                    break;
                case 'cancel':
                    panel.dispose();
                    break;
            }
        };
        const opt = {
            viewType: 'token-view',
            title: 'Add ACL Token',
            key: 'create',
            template: 'token',
            handleMessage,
            data: { policies, roles },
        };
        provider.view.render(opt);
    });

    const edit = vscode.commands.registerCommand('consul.acl.token.edit', async (item: LoclTreeItem) => {
        const policies = (await item.provider?.list_policy()) || [];
        const roles = (await item.provider?.list_role()) || [];
        const token = await item.provider?.read_token(item.key);
        if (!token) {
            vscode.window.showErrorMessage(`Token not found: ${item.key}`);
            return;
        }
        const handleMessage = async (panel: vscode.WebviewPanel, message: { command: string; data: any }) => {
            switch (message.command) {
                case 'save':
                    try {
                        const data = message.data;
                        const opt = upperObj(data);
                        await item.provider?.update_token(item.key, opt);
                        vscode.window.showInformationMessage('Successfully updated token');
                        panel.dispose();
                        provider.refresh();
                    } catch (error) {
                        vscode.window.showErrorMessage(`Failed to update token: ${error}`);
                    }
                    break;
                case 'cancel':
                    panel.dispose();
                    break;
            }
        };
        const opt = {
            viewType: 'token-view',
            title: 'Edit ACL Token',
            key: 'edit-token-' + item.key,
            template: 'token',
            handleMessage,
            data: { policies, roles, token },
        };
        provider.view.render(opt);
    });

    const del = vscode.commands.registerCommand('consul.acl.token.del', async (item: LoclTreeItem) => {
        try {
            const answer = await vscode.window.showWarningMessage(vscode.l10n.t('Are you sure you want to delete this token {0} ?', item.label), { modal: true }, 'Yes');

            if (answer !== 'Yes') {
                return;
            }
            const id = item.key;
            if (id) {
                await item.provider?.del_token(id);
                provider.refresh();
                vscode.window.showInformationMessage(`Successfully deleted token: ${id}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to delete token: ${error}`);
        }
    });

    return [add, edit, del];
};
