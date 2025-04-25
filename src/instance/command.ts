import { ConsulOptions } from 'consul/lib/consul';
import ConsulInstanceTreeItem from './treeitem';
import { ConsulTreeDataProvider } from '../providers/treeDataProvider';
import vscode from 'vscode';
import Consul from 'consul';
import { anyToString, buildRawDataURI } from '../common';

export default (context: vscode.ExtensionContext, provider: ConsulTreeDataProvider): vscode.Disposable[] => {
    const localize = (message: string, ...args: Array<string | number | boolean>) => {
        return vscode.l10n.t(message, args);
    };
    const addInstanceCommand = vscode.commands.registerCommand('consul.addInstance', async () => {
        const _name = await vscode.window.showInputBox({
            prompt: localize('Add Consul Instance'),
            placeHolder: localize('Instance Name'),
        });
        const name = _name?.trim();

        if (name) {
            if (/\s|\/|\:/i.test(name)) {
                vscode.window.showErrorMessage(localize('Invalid Instance Name'));
                return;
            }
            try {
                await provider.addConsulInstance(name);
                vscode.window.showInformationMessage(localize('Instance Added Successfully', name));
            } catch (error) {
                vscode.window.showErrorMessage(localize('Failed to Add Instance', anyToString(error)));
            }
        }
    });

    const removeInstanceCommand = vscode.commands.registerCommand('consul.removeInstance', async (node) => {
        if (node) {
            const answer = await vscode.window.showWarningMessage(vscode.l10n.t('Are you sure you want to delete instance {0} ?', node.label), { modal: true }, 'Yes');

            if (answer !== 'Yes') {
                return;
            }
            await provider.removeConsulInstance(node.label);
            vscode.window.showInformationMessage(localize('Instance Removed Successfully', node.label));
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
                vscode.window.showErrorMessage(localize('Failed to Connect to Instance', anyToString(error)));
            }
        }
    });

    const disconnectCommand = vscode.commands.registerCommand('consul.disconnect', async (node) => {
        if (node) {
            await provider.disconnectInstance(node.label);
            vscode.window.showInformationMessage(localize('Instance Disconnected Successfully', node.label));
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
                        vscode.window.showInformationMessage(localize('Configuration Saved Successfully'));
                        panel.dispose();
                    } catch (error) {
                        vscode.window.showErrorMessage(localize('Failed to Save Configuration', anyToString(error)));
                    }
                    break;
                case 'test':
                    try {
                        const cfg: ConsulOptions = message.config;
                        const consul = new Consul(cfg);
                        await consul.agent.members();
                        vscode.window.showInformationMessage(localize('Configuration Test Successful', node.label));
                    } catch (error) {
                        vscode.window.showErrorMessage(localize('Failed to Test Configuration', anyToString(error)));
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
            title: localize('Configure Consul Instance', key),
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
                title: localize('Save Consul Snapshot'),
            });
            if (!saveUri) {
                return;
            }
            if (item.provider) {
                const buf = await item.provider.snapshot();
                await vscode.workspace.fs.writeFile(saveUri, buf);
                vscode.window.showInformationMessage(localize('Snapshot Saved Successfully'));
            }
        } catch (error) {
            vscode.window.showErrorMessage(localize('Failed to Save Snapshot {0}', anyToString(error)));
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
            vscode.window.showErrorMessage(localize('Failed to Restore Snapshot: {}', anyToString(error)));
        }
    });

    const info = vscode.commands.registerCommand('consul.agent.self', async (item: ConsulInstanceTreeItem) => {
        try {
            if (item.provider) {
                const info = await item.provider.getInfo();
                if(!info){
                    return;
                }
                const _text = JSON.stringify(info);
                if (_text) {
                    const uri = buildRawDataURI('agent info', 'json', _text);
                    const doc = await vscode.workspace.openTextDocument(uri);
                    await vscode.window.showTextDocument(doc);
                }
            }
        } catch (error) {
            vscode.window.showErrorMessage(localize('Failed to Get Agent Info: {}', anyToString(error)));
        }
    }); 

    return [addInstanceCommand, removeInstanceCommand, refreshCommand, connectCommand, disconnectCommand, configureInstanceCommand, snapshotCommand, restoreCommand, info];
};
