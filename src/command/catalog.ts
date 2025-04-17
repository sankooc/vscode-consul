import { CatalogTreeItem } from "../providers/consulProvider";
import { ConsulTreeDataProvider } from "../providers/treeDataProvider";
import vscode from 'vscode';


export const build = (context: vscode.ExtensionContext, consulTreeProvider: ConsulTreeDataProvider): vscode.Disposable[] => {
    // const add = vscode.commands.registerCommand('consul.', async (item: CatalogTreeItem) => {
    //     const provider = item.provider;
    // });
    const edit = vscode.commands.registerCommand('consul.service.view', async (item: CatalogTreeItem) => {
        
    })
    return [];
};