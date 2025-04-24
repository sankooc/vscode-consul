import CatalogTreeItem from './treeitem';
import { ConsulTreeDataProvider } from '../providers/treeDataProvider';
import vscode from 'vscode';
import { buildRawDataURI } from '../common';

export default (context: vscode.ExtensionContext, consulTreeProvider: ConsulTreeDataProvider): vscode.Disposable[] => {
    // vscode.workspace.registerTextDocumentContentProvider(CatalogTreeItem.schema, {
    //     async provideTextDocumentContent(uri: vscode.Uri, _: vscode.CancellationToken): Promise<string> {
    //         try {
    //             if(uri.path === '/raw'){
    //                 const opt = uri.query.split('=');
    //                 if(opt && opt[1]) {
    //                     const cont =  opt[1];
    //                     return JSON.stringify(JSON.parse(cont), null, 2);
    //                 }
    //             }

    //         }catch(e){
    //             vscode.window.showErrorMessage(`Failed to get info: ${e}`);
    //         }
    //         return "";
    //     }
    // });
    const edit = vscode.commands.registerCommand('consul.service.view', async (item: CatalogTreeItem) => {
        // const url = item.buildURI();
        const content = JSON.stringify(item.content);
        const uri = buildRawDataURI(`catelog-${item.type}`, 'json', content);
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc);
    });
    return [edit];
};
