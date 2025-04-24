import { ConsulTreeDataProvider } from '../../providers/treeDataProvider';
import LoclTreeItem from './treeitem';
import vscode from 'vscode';
import { upperObj } from '../../common';

export default (context: vscode.ExtensionContext, provider: ConsulTreeDataProvider): vscode.Disposable[] => {
    const add = vscode.commands.registerCommand('consul.acl.role.add', async (item: LoclTreeItem) => {
        const policies = (await item.provider?.list_policy()) || [];
        const handleMessage = async (panel: vscode.WebviewPanel, message: { command: string; data: any }) => {
            switch (message.command) {
                case 'save':
                    try {
                        const data = message.data;
                        const opt = upperObj(data);
                        await item.provider?.add_role(opt);
                        vscode.window.showInformationMessage('Successfully added role');
                        panel.dispose();
                        provider.refresh();
                    } catch (error) {
                        vscode.window.showErrorMessage(`Failed to add role: ${error}`);
                    }
                    break;
                case 'cancel':
                    panel.dispose();
                    break;
            }
        };
        const opt = {
            viewType: 'role-view',
            title: 'Add ACL Role',
            key: 'create',
            template: 'role',
            handleMessage,
            data: { policies },
        };
        provider.view.render(opt);
    });

    const edit = vscode.commands.registerCommand('consul.acl.role.edit', async (item: LoclTreeItem) => {
        const policies = (await item.provider?.list_policy()) || [];
        const role = await item.provider?.read_role(item.key);
        if (!role) {
            vscode.window.showErrorMessage(`Role not found: ${item.key}`);
            return;
        }
        const handleMessage = async (panel: vscode.WebviewPanel, message: { command: string; data: any }) => {
            switch (message.command) {
                case 'save':
                    try {
                        const data = message.data;
                        const opt = upperObj(data);
                        await item.provider?.update_role(item.key, opt);
                        vscode.window.showInformationMessage('Successfully updated role');
                        panel.dispose();
                        provider.refresh();
                    } catch (error) {
                        vscode.window.showErrorMessage(`Failed to update role: ${error}`);
                    }
                    break;
                case 'cancel':
                    panel.dispose();
                    break;
            }
        };
        const opt = {
            viewType: 'role-view',
            title: 'Edit ACL Role',
            key: 'role-edit-' + item.key,
            template: 'role',
            handleMessage,
            data: { policies, role },
        };
        provider.view.render(opt);
    });

    const del = vscode.commands.registerCommand('consul.acl.role.del', async (item: LoclTreeItem) => {
        try {
            const answer = await vscode.window.showWarningMessage(vscode.l10n.t('Are you sure you want to delete this role {0} ?', item.label), { modal: true }, 'Yes');

            if (answer !== 'Yes') {
                return;
            }
            const id = item.key;
            if (id) {
                await item.provider?.del_role(id);
                provider.refresh();
                vscode.window.showInformationMessage(`Successfully deleted role: ${id}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to delete role: ${error}`);
        }
    });

    return [add, edit, del];
};
