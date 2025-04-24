import { ConsulOptions } from 'consul/lib/consul';
import ConsulInstanceTreeItem from './treeitem';
import { ConsulTreeDataProvider } from '../providers/treeDataProvider';
import vscode from 'vscode';
import Consul from 'consul';

export default (context: vscode.ExtensionContext, provider: ConsulTreeDataProvider): vscode.Disposable[] => {
    const addInstanceCommand = vscode.commands.registerCommand('consul.addInstance', async () => {
        const _name = await vscode.window.showInputBox({
            prompt: 'Enter a name for the Consul instance',
            placeHolder: 'e.g., Local Development',
        });
        const name = _name?.trim();

        if (name) {
            if (/\s|\/|\:/i.test(name)) {
                vscode.window.showErrorMessage('Instance name invalid');
                return;
            }
            try {
                await provider.addConsulInstance(name);
                vscode.window.showInformationMessage(`Successfully added Consul instance: ${name}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to add Consul instance: ${error}`);
            }
        }
    });

    const removeInstanceCommand = vscode.commands.registerCommand('consul.removeInstance', async (node) => {
        if (node) {
            await provider.removeConsulInstance(node.label);
            vscode.window.showInformationMessage(`Removed Consul instance: ${node.label}`);
        }
    });

    const refreshCommand = vscode.commands.registerCommand('consul.refresh', () => {
        provider.refresh();
    });

    const connectCommand = vscode.commands.registerCommand('consul.connect', async (node) => {
        if (node) {
            try {
                await provider.connectInstance(node.label);
                // vscode.window.showInformationMessage(`Connected to Consul instance: ${node.label}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to connect: ${error}`);
            }
        }
    });

    const disconnectCommand = vscode.commands.registerCommand('consul.disconnect', async (node) => {
        if (node) {
            await provider.disconnectInstance(node.label);
            vscode.window.showInformationMessage(`Disconnected from Consul instance: ${node.label}`);
        }
    });

    const configureInstanceCommand = vscode.commands.registerCommand('consul.configureInstance', async (node: ConsulInstanceTreeItem) => {
        if (!node) {
            return;
        }

        const handleMessage = async (panel: vscode.WebviewPanel, message: any) => {
            switch (message.command) {
                case 'save':
                    try {
                        const cfg: ConsulOptions = message.config;
                        node.provider.setConfig(cfg);
                        await provider.persistInstances();
                        vscode.window.showInformationMessage('Configuration saved successfully');
                        panel.dispose();
                    } catch (error) {
                        vscode.window.showErrorMessage(`Failed to save configuration: ${error}`);
                    }
                    break;
                case 'test':
                    try {
                        const cfg: ConsulOptions = message.config;
                        const consul = new Consul(cfg);
                        await consul.agent.members();
                        vscode.window.showInformationMessage(`Connection[${node.label}] test successful`);
                    } catch (error) {
                        vscode.window.showErrorMessage(`Connection test failed: ${error}`);
                    }
                    break;
                case 'cancel':
                    panel.dispose();
                    break;
            }
        };

        const currentConfig: any = node.provider.getConfig() || { host: '', port: 8500, secure: false, defaults: { token: '' } };
        currentConfig._secure = currentConfig.secure ? 'checked' : '';
        const key = node.label;
        const opt = {
            viewType: 'consulConfig',
            title: `Configure [${key}]`,
            template: 'instance',
            key: key,
            handleMessage,
            data: {
                label: key,
                config: currentConfig,
            },
        };
        provider.view.render(opt);
    });

    const snapshot = vscode.commands.registerCommand('consul.snapshot', async (node: ConsulInstanceTreeItem) => {
        try {
            const saveUri = await vscode.window.showSaveDialog({
                filters: { 'Snapshot File': ['snapshot'] },
            });
            if (!saveUri) {
                return;
            }
            if (node.provider) {
                const buf = await node.provider.snapshot();
                await vscode.workspace.fs.writeFile(saveUri, buf);
                vscode.window.showInformationMessage('Snapshot saved successfully');
            }
        } catch (error) {
            console.error(error);
        }
    });
    const restore = vscode.commands.registerCommand('consul.restore', async (node: ConsulInstanceTreeItem) => {
        const openUris = await vscode.window.showOpenDialog({
            filters: { 'snapshot File': ['snapshot'] },
            canSelectMany: false,
        });
        if (!openUris || openUris.length === 0) {
            return;
        }
        const fileUri = openUris[0];
        const fileData = await vscode.workspace.fs.readFile(fileUri);
        try {
            if (node.provider) {
                await node.provider.restore(Buffer.from(fileData));
                vscode.window.showInformationMessage('Snapshot restored successfully');
            }
        } catch (error) {
            console.error(error);
        }
    });
    return [addInstanceCommand, removeInstanceCommand, refreshCommand, connectCommand, disconnectCommand, configureInstanceCommand, snapshot, restore];
};
