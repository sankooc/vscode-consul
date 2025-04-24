import vscode from 'vscode';
import Handlebars from 'handlebars';
import fs from 'node:fs';
import path from 'node:path';

interface ViewOption {
    viewType: string;
    title: string;
    template: string;
    key: string;
    data: any;
    handleMessage?: (panel: vscode.WebviewPanel, message: { command: string; data: any }) => Promise<void>;
}
const TEMPLATE_DIR = 'resources';
const MEDIA = 'media';
export default class Viewer {
    private mapper: Record<string, HandlebarsTemplateDelegate<any>> = {};

    private configPanels: Map<string, vscode.WebviewPanel> = new Map();
    private dir: vscode.Uri;
    private jsfile: vscode.Uri;
    constructor(private readonly context: vscode.ExtensionContext) {
        this.dir = context.extensionUri;
        const extensionPath = this.dir.fsPath;
        const templatePath = path.join(extensionPath, TEMPLATE_DIR, 'template');
        try {
            const files = fs.readdirSync(templatePath);
            for (const ff of files) {
                if (ff.endsWith('.html')) {
                    const name = ff.substring(0, ff.length - 5);
                    const template = fs.readFileSync(path.join(templatePath, ff), 'utf-8');
                    this.mapper[name] = Handlebars.compile(template);
                }
            }
            console.log('Template files:', files);
        } catch (error) {
            console.error('Error reading template directory:', error);
        }
        this.jsfile = vscode.Uri.joinPath(context.extensionUri, MEDIA, 'webview', 'toolkit.bundle.js');
    }

    render(option: ViewOption): vscode.WebviewPanel {
        const { template, key } = option;
        const existingPanel = this.configPanels.get(key);
        if (existingPanel) {
            existingPanel.reveal();
            return existingPanel;
        }

        const compiler = this.mapper[template];
        if (!compiler) {
            throw new Error(`Template ${template} not found`);
        }
        const panel = vscode.window.createWebviewPanel(option.viewType, option.title, vscode.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this.dir, MEDIA, 'webview'), vscode.Uri.joinPath(this.dir, TEMPLATE_DIR, 'template')],
        });
        this.configPanels.set(key, panel);
        panel.onDidDispose(() => {
            this.configPanels.delete(key);
        });
        // console.log('--- path test');
        // console.log(this.jsfile.fsPath);
        // const jsfile = panel.webview.asWebviewUri(this.jsfile).toString();
        const host = panel.webview.asWebviewUri(this.context.extensionUri).toString();
        // console.log(panel.webview.asWebviewUri(this.context.extensionUri).toString());
        const data = { host, ...option.data };
        panel.webview.html = compiler(data);
        panel.webview.onDidReceiveMessage(
            async (message) => {
                await option.handleMessage?.(panel, message);
            },
            undefined,
            this.context.subscriptions
        );
        return panel;
    }
}
