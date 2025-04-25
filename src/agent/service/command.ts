import { ConsulTreeDataProvider } from '../../providers/treeDataProvider';
import LoclTreeItem from './treeitem';
import vscode from 'vscode';
import { RegisterOptions } from 'consul/lib/agent/service';
import ConsulProvider from '../../providers/consulProvider';


const handleMessage = async (panel: vscode.WebviewPanel, message: { command: string; data: any }, provider: ConsulProvider) => {
    switch (message.command) {
        case 'save':
            try {
                const data = message.data;
                const opt: RegisterOptions = {
                    name: data.name,
                    id: data.id || data.name,
                    tags: data.tags ? data.tags.split(',').map((t: string) => t.trim()) : [],
                    address: data.address,
                    port: parseInt(data.port),
                    meta: data.meta ? JSON.parse(data.meta) : undefined,
                    check: data.check ? {
                        name: data.check.name,
                        http: data.check.http,
                        interval: data.check.interval,
                        timeout: data.check.timeout
                    } : undefined
                };
                await provider.agent?.registerService(opt);
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

export default (context: vscode.ExtensionContext, provider: ConsulTreeDataProvider): vscode.Disposable[] => {

    
    const register = vscode.commands.registerCommand('consul.service.register', async (item: LoclTreeItem) => {
        // const provider = item.provider;
        if(item.provider){
            const opt = {
                viewType: 'service-register',
                title: 'Register Service',
                key: 'register',
                template: 'service',
                handleMessage: (panel: vscode.WebviewPanel, message: any) => handleMessage(panel, message, item.provider!),
                data: {}
            };
            provider.view.render(opt);

        }
    });

    return [register];
};
