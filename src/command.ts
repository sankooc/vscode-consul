import vscode from 'vscode';
import { ConsulTreeDataProvider } from './providers/treeDataProvider';
import instanceBuild from './instance/command';
import kvBuild from './kv/command';
import catalogBuild from './catelog/command';
import policy from './acl/policy/command';
import token from './acl/token/command';
import role from './acl/role/command';
import tp from './acl/templatedPolicy/command';
import agent from './agent/command';
import { parseQuery, RAW_DATA_SCHEMA } from './common';

export const build = (context: vscode.ExtensionContext, consulTreeProvider: ConsulTreeDataProvider): vscode.Disposable[] => {
    vscode.workspace.registerTextDocumentContentProvider(RAW_DATA_SCHEMA, {
        async provideTextDocumentContent(uri: vscode.Uri, _: vscode.CancellationToken): Promise<string> {
            const content = parseQuery(uri.query);
            return content;
        },
    });
    return [
        ...instanceBuild(context, consulTreeProvider),
        ...kvBuild(context, consulTreeProvider),
        ...catalogBuild(context, consulTreeProvider),
        ...policy(context, consulTreeProvider),
        ...token(context, consulTreeProvider),
        ...tp(context, consulTreeProvider),
        ...role(context, consulTreeProvider),
        ...agent(context, consulTreeProvider),
    ];
};
