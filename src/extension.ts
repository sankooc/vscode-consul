import * as vscode from 'vscode';
import { ConsulTreeDataProvider } from './providers/treeDataProvider';
import { build } from './command';
import { log } from './common';

export function activate(context: vscode.ExtensionContext) {
    const consulTreeProvider = new ConsulTreeDataProvider(context);
    vscode.window.registerTreeDataProvider('consulInstances', consulTreeProvider);
    context.subscriptions.push(...build(context, consulTreeProvider));
    log('active complete');
}

export function deactivate() { }
