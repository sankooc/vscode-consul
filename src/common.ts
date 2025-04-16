// import { ConsulProvider, KVTreeItem } from "./providers/consulProvider";

export const log = function(...args: any){
    console.log(...args);
};

// interface ConsulTreeNode {
//     isLeaf?: boolean;
//     value?: string;
//     [key: string]: ConsulTreeNode | boolean | string | undefined;
// }
// export const buildKVTree = function(label: string, items: Array<string>): KVTreeItem[] {
//     const root: { [key: string]: any } = {};
//     for (const item of items) {
//         const parts: string[] = [item];
//         let current = root;
//         // const result = await this._consul.kv.get(item);
//         // if (!result || !result.Value){
//         //     continue;
//         // }
//         // const val = result.Value;
//         for (let i = 0; i < parts.length; i++) {
//             const part = parts[i];
//             if (i === parts.length - 1) {
//                 current[part] = {
//                     // value: val ? Buffer.from(val).toString() : '',
//                     isLeaf: true
//                 };
//             } else {
//                 current[part] = current[part] || {};
//                 current = current[part];
//             }
//         }
//     }

//     return convertToTreeItems(label, root, '');
// }

// export const convertToTreeItems = function (label: string, node: ConsulTreeNode, path: string = ''): KVTreeItem[] {
//     return Object.entries(node).map(([key, value]) => {
//         const currentPath = path ? `${path}/${key}` : key;
//         if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
//             if (value.isLeaf) {
//                 return new KVTreeItem(
//                     key,
//                     currentPath,
//                     value.value || '',
//                     0, //vscode.TreeItemCollapsibleState.None,
//                     'kvValue',
//                     // this.url,
//                     label
//                 );
//             } else {
//                 return new KVTreeItem(
//                     key,
//                     currentPath,
//                     '',
//                     1, //vscode.TreeItemCollapsibleState.Collapsed,
//                     'kvFolder',
//                     // this.url,
//                     label,
//                     convertToTreeItems(label,value as ConsulTreeNode, currentPath)
//                 );
//             }
//         }
//         // Handle other cases or throw an error
//         throw new Error(`Unexpected value type for key ${key}`);
//     });
// }