import { ConsulTreeDataProvider } from '../../providers/treeDataProvider';
import LoclTreeItem from './treeitem';
import vscode from 'vscode';
import { RegisterOptions } from 'consul/lib/agent/service';
import ConsulProvider from '../../providers/consulProvider';
import { buildRawDataURI } from '../../common';

export default (context: vscode.ExtensionContext, provider: ConsulTreeDataProvider): vscode.Disposable[] => {
    const handleMessage = async (panel: vscode.WebviewPanel, message: { command: string; data: any }, consulProvider: ConsulProvider) => {
        switch (message.command) {
            case 'save':
                try {
                    const data = message.data;
                    const opt: RegisterOptions = {
                        name: data.name,
                        tags: data.tags ? data.tags.split(',').map((t: string) => t.trim()) : [],
                        address: data.address ? data.address : undefined,
                        port: data.port ? parseInt(data.port) : undefined,
                        meta: data.meta ? JSON.parse(data.meta) : undefined,
                    };
                    await consulProvider.agent?.registerService(opt);
                    vscode.window.showInformationMessage('Successfully registered service');
                    panel.dispose();
                    provider.refresh();
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to register service: ${error}`);
                }
                break;
            case 'cancel':
                panel.dispose();
                break;
        }
    };

    const register = vscode.commands.registerCommand('consul.service.register', async (item: LoclTreeItem) => {
        if (item.provider) {
            const opt = {
                viewType: 'service-register',
                title: 'Register Service',
                key: 'register',
                template: 'service',
                handleMessage: (panel: vscode.WebviewPanel, message: any) => handleMessage(panel, message, item.provider!),
                data: {},
            };
            provider.view.render(opt);
        }
    });

    const view = vscode.commands.registerCommand('consul.agent.service.view', async (item: LoclTreeItem) => {
        const data = item._item;
        if (data) {
            const uri = buildRawDataURI(`service-${item.key}`, 'json', JSON.stringify(data));
            const doc = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(doc, { preview: false });
        }
    });

    const deregister = vscode.commands.registerCommand('consul.service.deregister', async (item: LoclTreeItem) => {
        try {
            const answer = await vscode.window.showWarningMessage(`Are you sure you want to deregister service ${item.label}?`, { modal: true }, 'Yes');

            if (answer !== 'Yes') {
                return;
            }

            await item.provider?.agent?.deregisterService(item.key);
            provider.refresh();
            vscode.window.showInformationMessage(`Successfully deregistered service: ${item.key}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to deregister service: ${error}`);
        }
    });

    return [register, view, deregister];
};
