import CatalogTreeItem from './treeitem';
import { ConsulTreeDataProvider } from '../providers/treeDataProvider';
import vscode from 'vscode';
import { buildRawDataURI } from '../common';

export default (context: vscode.ExtensionContext, consulTreeProvider: ConsulTreeDataProvider): vscode.Disposable[] => {
    const edit = vscode.commands.registerCommand('consul.service.view', async (item: CatalogTreeItem) => {
        // const url = item.buildURI();
        const content = JSON.stringify(item.content);
        const uri = buildRawDataURI(`catelog-${item.type}`, 'json', content);
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc);
    });
    return [edit];
};
