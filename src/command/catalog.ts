import { CatalogTreeItem } from "../providers/consulProvider";
import { ConsulTreeDataProvider } from "../providers/treeDataProvider";
import vscode from 'vscode';


export const build = (context: vscode.ExtensionContext, consulTreeProvider: ConsulTreeDataProvider): vscode.Disposable[] => {

    vscode.workspace.registerTextDocumentContentProvider(CatalogTreeItem.schema, {
        async provideTextDocumentContent(uri: vscode.Uri, _: vscode.CancellationToken): Promise<string> {
            try {
                if(uri.path === '/raw'){
                    const opt = uri.query.split('=');
                    if(opt && opt[1]) {
                        const cont =  opt[1];
                        return JSON.stringify(JSON.parse(cont), null, 2); 
                    }
                }

            }catch(e){
                vscode.window.showErrorMessage(`Failed to get info: ${e}`);
            }
            return "";
        }
    });
    const edit = vscode.commands.registerCommand('consul.service.view', async (item: CatalogTreeItem) => {
        const url = item.buildURI();
        // const content = (await vscode.workspace.fs.readFile(url)).toString();
        const doc = await vscode.workspace.openTextDocument(url);
        // const content = await doc.getText();
        // const doc2 = await vscode.workspace.openTextDocument({
        //     content,
        //     language: 'json'
        // });
        await vscode.window.showTextDocument(doc);
    });
    return [edit];
};