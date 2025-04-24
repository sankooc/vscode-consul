// import { ConsulProvider, KVTreeItem } from "./providers/consulProvider";
import vscode from 'vscode';
import { ConsulTreeDataProvider, ConsulTreeItem } from './providers/treeDataProvider';
import ConsulProvider from './providers/consulProvider';

export const log = function (...args: any) {
    console.log(...args);
};


export interface ConsulNode {
    ID: string;
    Node: string;
    Address: string;
    Datacenter?: string;
    TaggedAddresses?: {
        lan: string;
        lan_ipv4: string;
        wan: string;
        wan_ipv4: string;
    };
    Meta?: {
        'consul-network-segment': string;
        'consul-version': string;
    };
    CreateIndex?: number;
    ModifyIndex?: number;
}

export interface ConsulService {
    ID: string;
    Service: string;
    Tags?: string[];
    Address?: string;
    Meta?: {
        grpc_tls_port: string;
        non_voter: string;
        raft_version: string;
        read_replica: string;
        serf_protocol_current: string;
        serf_protocol_max: string;
        serf_protocol_min: string;
        version: string;
    };
    Port: number;
    Weights?: { Passing: number; Warning: number };
    EnableTagOverride?: boolean;
    Proxy?: {
        Mode: string;
        MeshGateway: {};
        Expose: {};
    };
    Connect?: {};
    PeerName?: string;
    CreateIndex?: number;
    ModifyIndex?: number;
}



export interface KVItem {
    key: string;
    value: string;
}

// const loader = {
//     "1.0": {
//         zip: (items: KVItem[]) => ({ meta: 'kv', version: '1.0', items}),
//     }
// }
export const zipData = function (items: KVItem[]): Buffer {
    const jsonData = JSON.stringify({ meta: 'kv', version: '1.0', items });
    return Buffer.from(jsonData, 'utf8');
};

export const unzipData = function (buf: Uint8Array): KVItem[] {
    const rs = JSON.parse(buf.toString());
    const { meta, version } = rs;
    if (meta !== 'kv') {
        return [];
    }
    const items: KVItem[] = rs.items;
    return items;
};


export class BasicTreeItem extends vscode.TreeItem {
    constructor(label: string, collapsibleState: vscode.TreeItemCollapsibleState) {
        super(label, collapsibleState);
    }
    async getChildren(): Promise<ConsulTreeItem[]> {
        return [];
    }
}



export class ConsulFileSystemProvider<T> implements vscode.FileSystemProvider {
    private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    private content_map = new Map<string, T>();

    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

    constructor(protected cProvider: ConsulTreeDataProvider) { }

    watch(uri: vscode.Uri): vscode.Disposable {
        return new vscode.Disposable(() => { });
    }

    async _read(provider: ConsulProvider, id: string): Promise<[string, T]> {
        throw new Error('Method not implemented.');
    }
    async content(uri: vscode.Uri): Promise<string> {
        const _path = uri.path;
        const [_, label, key] = _path.split('/');
        const provider = this.cProvider.getActiveProvider(label);
        if (provider) {
            const [_text, cache] = await this._read(provider, key);
            this.content_map.set(_path, cache);
            return _text;
        }
        throw vscode.FileSystemError.FileNotFound(uri);
    }
    stat(uri: vscode.Uri): vscode.FileStat {
        const _path = uri.path;
        const stat = this.content_map.get(_path);
        const def = {
            type: vscode.FileType.File,
            ctime: Date.now(),
            mtime: Date.now(),
            size: 0,
        };
        if (stat) {
            return { ...def, ...stat };
        }
        return def;
    }

    readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
        return [];
    }

    createDirectory(uri: vscode.Uri): void { }

    async readFile(uri: vscode.Uri): Promise<Uint8Array> {
        const _content = await this.content(uri);
        return new TextEncoder().encode(_content);
    }

    async writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean, overwrite: boolean }): Promise<void> {
        const _path = uri.path;
        const cache = this.content_map.get(_path);
        const [_, label, id] = _path.split('/');
        const provider = this.cProvider.getActiveProvider(label);
        if (provider && cache) {
            const value = new TextDecoder().decode(content);
            await this._update(provider, id, value, cache);
        }
    }

    async _update(provider: ConsulProvider, id: string, value: string, cache: T): Promise<boolean> {
        return false;
    }

    delete(uri: vscode.Uri): void {
        const _path = uri.path;
        const [_, label, id] = _path.split('/');
        const provider = this.cProvider.getActiveProvider(label);
        if (provider) {
            this._delete(provider, id).then((result) => {
                if (result) {
                    this.content_map.delete(_path);
                    this._emitter.fire([{
                        type: vscode.FileChangeType.Deleted,
                        uri: uri
                    }]);
                }
            }).catch((error) => {
                vscode.window.showErrorMessage(`Failed to delete: ${error}`);
            });
        }
    }

    async _delete(provider: ConsulProvider, id: string): Promise<boolean> {
        return false;
    }

    rename(oldUri: vscode.Uri, newUri: vscode.Uri): void {
    }
}

export const upperObj = (opt: any): any => {
    if (!opt) {
        return opt;
    }
    const rs: { [key: string]: any } = {};
    for (const key of Object.keys(opt)) {
        const value = opt[key];
        if (value !== '' && value !== null && value !== undefined) {
            const upperKey = key.charAt(0).toUpperCase() + key.slice(1);
            rs[upperKey] = value;
        }
    }
    return rs;
};


export const RAW_DATA_SCHEMA = 'raw-data';

export function parseQuery(queryString: string): string {
    if (!queryString) return '';
    const params: Record<string, string> = {};
    try {
        const pairs = queryString.split('&');
        for (const pair of pairs) {
            const [key, value] = pair.split('=');
            if (key && value) {
                params[decodeURIComponent(key)] = decodeURIComponent(value);
            }
        }
        switch (params.type) {
            case 'json':
                return JSON.stringify(JSON.parse(params.data), null, 2);
            default:
                return params.data || '';
        }
    } catch (e) {
        console.error(e);
    }
    return params.data || '';
}

export const buildRawDataURI = (name: string, type: string, data: string): vscode.Uri => {
    return vscode.Uri.from({
        scheme: RAW_DATA_SCHEMA,
        path: `/${name}`,
        query: `type=${encodeURIComponent(type)}&data=${encodeURIComponent(data)}`
    });
    // return vscode.Uri.parse(`${RAW_DATA_SCHEMA}:/${name}?type=${type}&data=${encodeURIComponent(data)}`).with({ scheme: RAW_DATA_SCHEMA });
};