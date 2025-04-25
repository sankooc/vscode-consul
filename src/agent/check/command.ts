import { ConsulTreeDataProvider } from '../../providers/treeDataProvider';
import LoclTreeItem from './treeitem';
import vscode from 'vscode';
import ConsulProvider from '../../providers/consulProvider';
import { buildRawDataURI } from '../../common';
import { RegisterOptions } from 'consul/lib/agent/check';

const handleMessage = async (panel: vscode.WebviewPanel, message: { command: string; data: any }, provider: ConsulProvider) => {
    switch (message.command) {
        case 'save':
            try {
                const data = message.data;
                const opt: RegisterOptions = {
                    name: data.name,
                    notes: data.notes,
                    http: data.http,
                    interval: data.interval,
                    timeout: data.timeout,
                    status: data.status,
                    // serviceId: data.serviceId,
                };
                await provider.agent?.registerCheck(opt);
                vscode.window.showInformationMessage('Successfully registered check');
                panel.dispose();
                provider.refresh();
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to register check: ${error}`);
            }
            break;
        case 'cancel':
            panel.dispose();
            break;
    }
};

export default (context: vscode.ExtensionContext, provider: ConsulTreeDataProvider): vscode.Disposable[] => {
    const register = vscode.commands.registerCommand('consul.check.register', async (item: LoclTreeItem) => {
        if (item.provider) {
            const services = (await item.provider.agent?.listService()) || [];
            const opt = {
                viewType: 'check-register',
                title: 'Register Check',
                key: 'register',
                template: 'check',
                handleMessage: (panel: vscode.WebviewPanel, message: any) => handleMessage(panel, message, item.provider!),
                data: { services },
            };
            provider.view.render(opt);
        }
    });

    const view = vscode.commands.registerCommand('consul.agent.check.view', async (item: LoclTreeItem) => {
        const data = item._item;
        if (data) {
            const uri = buildRawDataURI(`check-${item.key}`, 'json', JSON.stringify(data));
            const doc = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(doc, { preview: false });
        }
    });

    const deregister = vscode.commands.registerCommand('consul.check.deregister', async (item: LoclTreeItem) => {
        try {
            const answer = await vscode.window.showWarningMessage(`Are you sure you want to deregister check ${item.label}?`, { modal: true }, 'Yes');

            if (answer !== 'Yes') {
                return;
            }

            await item.provider?.agent?.deregisterCheck(item.key);
            provider.refresh();
            vscode.window.showInformationMessage(`Successfully deregistered check: ${item.key}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to deregister check: ${error}`);
        }
    });

    return [register, view, deregister];
};
