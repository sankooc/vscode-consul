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

    const del = vscode.commands.registerCommand('consul.acl.role.del', async (item: LoclTreeItem) => {
        try {
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

    return [add, del];
};
