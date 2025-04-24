import { ConsulOptions } from 'consul/lib/consul';
import ConsulInstanceTreeItem from './treeitem';
import { ConsulTreeDataProvider } from '../providers/treeDataProvider';
import vscode from 'vscode';
import Consul from 'consul';
import { anyToString } from '../common';

export default (context: vscode.ExtensionContext, provider: ConsulTreeDataProvider): vscode.Disposable[] => {
    const localize = (message: string, ...args: Array<string | number | boolean>) => {
        return vscode.l10n.t(message, args);
    };
    const addInstanceCommand = vscode.commands.registerCommand('consul.addInstance', async () => {
        const _name = await vscode.window.showInputBox({
            prompt: localize('consul.addInstance.prompt', 'Add Consul Instance'),
            placeHolder: localize('consul.addInstance.placeholder', 'Instance Name'),
        });
        const name = _name?.trim();

        if (name) {
            if (/\s|\/|\:/i.test(name)) {
                vscode.window.showErrorMessage(localize('consul.addInstance.error', 'Invalid Instance Name'));
                return;
            }
            try {
                await provider.addConsulInstance(name);
                vscode.window.showInformationMessage(localize('consul.addInstance.success', 'Instance Added Successfully', name));
            } catch (error) {
                vscode.window.showErrorMessage(localize('consul.addInstance.failed', 'Failed to Add Instance', anyToString(error)));
            }
        }
    });

    const removeInstanceCommand = vscode.commands.registerCommand('consul.removeInstance', async (node) => {
        if (node) {
            await provider.removeConsulInstance(node.label);
            vscode.window.showInformationMessage(localize('consul.removeInstance.success', 'Instance Removed Successfully', node.label));
        }
    });

    const refreshCommand = vscode.commands.registerCommand('consul.refresh', () => {
        provider.refresh();
    });

    const connectCommand = vscode.commands.registerCommand('consul.connect', async (node) => {
        if (node) {
            try {
                await provider.connectInstance(node.label);
            } catch (error) {
                vscode.window.showErrorMessage(localize('consul.connect.error', 'Failed to Connect to Instance', anyToString(error)));
            }
        }
    });

    const disconnectCommand = vscode.commands.registerCommand('consul.disconnect', async (node) => {
        if (node) {
            await provider.disconnectInstance(node.label);
            vscode.window.showInformationMessage(localize('consul.disconnect.success', 'Instance Disconnected Successfully', node.label));
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
                        vscode.window.showInformationMessage(localize('consul.configureInstance.save.success', 'Configuration Saved Successfully'));
                        panel.dispose();
                    } catch (error) {
                        vscode.window.showErrorMessage(localize('consul.configureInstance.save.error', 'Failed to Save Configuration', anyToString(error)));
                    }
                    break;
                case 'test':
                    try {
                        const cfg: ConsulOptions = message.config;
                        const consul = new Consul(cfg);
                        await consul.agent.members();
                        vscode.window.showInformationMessage(localize('consul.configureInstance.test.success', 'Configuration Test Successful', node.label));
                    } catch (error) {
                        vscode.window.showErrorMessage(localize('consul.configureInstance.test.error', 'Failed to Test Configuration', anyToString(error)));
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
            title: localize('consul.configureInstance.title', 'Configure Consul Instance', key),
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

    const snapshotCommand = vscode.commands.registerCommand('consul.snapshot', async (item: ConsulInstanceTreeItem) => {
        try {
            const saveUri = await vscode.window.showSaveDialog({
                filters: { 'Snapshot File': ['snapshot'] },
                title: localize('consul.snapshot', 'Save Consul Snapshot'),
            });
            if (!saveUri) {
                return;
            }
            if (item.provider) {
                const buf = await item.provider.snapshot();
                await vscode.workspace.fs.writeFile(saveUri, buf);
                vscode.window.showInformationMessage(localize('consul.snapshot.success', 'Snapshot Saved Successfully'));
            }
        } catch (error) {
            vscode.window.showErrorMessage(localize('consul.snapshot.failed', 'Failed to Save Snapshot', anyToString(error)));
        }
    });

    const restoreCommand = vscode.commands.registerCommand('consul.restore', async (item: ConsulInstanceTreeItem) => {
        try {
            const openUris = await vscode.window.showOpenDialog({
                filters: { 'Snapshot File': ['snapshot'] },
                canSelectMany: false,
                title: localize('Consul Restore'),
            });
            if (openUris && openUris[0] && item.provider) {
                const fileData = await vscode.workspace.fs.readFile(openUris[0]);
                await item.provider.restore(Buffer.from(fileData));
                provider.persistInstances();
                provider.refresh();
                vscode.window.showInformationMessage(localize('Snapshot Restored Successfully'));
                return;
            }
        } catch (error) {
            vscode.window.showErrorMessage(localize('Failed to Restore Snapshot', anyToString(error)));
        }
    });

    return [addInstanceCommand, removeInstanceCommand, refreshCommand, connectCommand, disconnectCommand, configureInstanceCommand, snapshotCommand, restoreCommand];
};
