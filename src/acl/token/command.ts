import { PolicyResult } from "consul/lib/acl/policy";
import { ConsulTreeDataProvider } from "../../providers/treeDataProvider";
import LoclTreeItem from './treeitem';
import vscode from 'vscode';
import { upperObj } from "../../common";

function getWebviewContent(policies: PolicyResult[], toolkitUri: vscode.Uri) {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script type="module" src="${toolkitUri}"></script>
        <style>
            body {
                padding: 20px;
            }
            .form-container {
                max-width: 800px;
                margin: 0 auto;
                display: none;
            }
            .form-group {
                margin-bottom: 24px;
            }
            .form-group > * {
                width: 100%;
            }
            .form-group-label {
                display: block;
                margin-bottom: 8px;
            }
            .policy-tags {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 8px;
            }
            .policy-tag {
                display: flex;
                align-items: center;
                gap: 4px;
                background: var(--vscode-badge-background);
                color: var(--vscode-badge-foreground);
                padding: 2px 8px;
                border-radius: 3px;
                font-size: 12px;
            }
            .policy-tag vscode-button {
                padding: 2px;
                min-width: 16px;
                height: 16px;
            }
            .button-container {
                display: flex;
                gap: 8px;
                margin-top: 24px;
            }
            .optional-label {
                color: var(--vscode-descriptionForeground);
                font-size: 0.9em;
            }
            vscode-details {
                margin-top: 16px;
                margin-bottom: 16px;
            }
            .advanced-options {
                padding: 16px;
                background: var(--vscode-editor-background);
                border: 1px solid var(--vscode-widget-border);
                border-radius: 4px;
            }
            .loading {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
            }
            .loading vscode-progress-ring {
                margin-bottom: 16px;
            }
            vscode-text-field::part(control),
            vscode-text-area::part(control),
            vscode-dropdown::part(control) {
                margin-top: 8px;
            }
            vscode-checkbox::part(control) {
                margin-left: 8px;
            }
        </style>
    </head>
    <body>
        <div class="loading" id="loading">
            <vscode-progress-ring></vscode-progress-ring>
            <div>Loading components...</div>
        </div>

        <div class="form-container" id="formContainer">
            <form id="tokenForm">
                <div class="form-group">
                    <label class="form-group-label">AccessorID <span class="optional-label">(optional)</span></label>
                    <vscode-text-field id="accessorId">
                        <span slot="description">Leave empty for auto-generation</span>
                    </vscode-text-field>
                </div>

                <div class="form-group">
                    <label class="form-group-label">SecretID <span class="optional-label">(optional)</span></label>
                    <vscode-text-field id="secretId">
                        <span slot="description">Leave empty for auto-generation</span>
                    </vscode-text-field>
                </div>

                <div class="form-group">
                    <label class="form-group-label">Description <span class="optional-label">(optional)</span></label>
                    <vscode-text-area id="description" rows="3">
                        <span slot="description">Describe the purpose of this token</span>
                    </vscode-text-area>
                </div>

                <div class="form-group">
                    <label class="form-group-label">Policies <span class="optional-label">(optional)</span></label>
                    <vscode-dropdown id="policySelector">
                        <span slot="description">Select policies to attach to this token</span>
                        <vscode-option value="">Select a policy to add...</vscode-option>
                        ${policies.map(p => `<vscode-option value="${p.Name}">${p.Name}</vscode-option>`).join('')}
                    </vscode-dropdown>
                    <div class="policy-tags" id="policyTags"></div>
                </div>

                <vscode-details>
                    <span slot="summary">Advanced Options</span>
                    <div class="advanced-options">
                        <div class="form-group">
                            <label class="form-group-label">Local Token</label>
                            <vscode-checkbox id="local">
                                <span slot="description">Token will not be replicated to other datacenters</span>
                            </vscode-checkbox>
                        </div>

                        <div class="form-group">
                            <label class="form-group-label">Expiration Time <span class="optional-label">(optional)</span></label>
                            <vscode-text-field type="datetime-local" id="expirationTime">
                                <span slot="description">When this token should expire</span>
                            </vscode-text-field>
                        </div>

                        <div class="form-group">
                            <label class="form-group-label">Expiration TTL <span class="optional-label">(optional)</span></label>
                            <vscode-text-field id="expirationTTL">
                                <span slot="description">Time duration (e.g., "24h", "30m")</span>
                            </vscode-text-field>
                        </div>
                    </div>
                </vscode-details>

                <div class="button-container">
                    <vscode-button appearance="primary" id="saveButton">Save</vscode-button>
                    <vscode-button appearance="secondary" id="cancelButton">Cancel</vscode-button>
                </div>
            </form>
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            const selectedPolicies = new Set();

            // 等待所有组件加载完成
            document.addEventListener('DOMContentLoaded', () => {
                // 给组件一点时间初始化
                setTimeout(() => {
                    document.getElementById('loading').style.display = 'none';
                    document.getElementById('formContainer').style.display = 'block';
                }, 100);
            });

            function updatePolicyTags() {
                const container = document.getElementById('policyTags');
                container.innerHTML = '';
                selectedPolicies.forEach(policy => {
                    const tag = document.createElement('div');
                    tag.className = 'policy-tag';
                    tag.innerHTML = \`
                        <span>\${policy}</span>
                        <vscode-button appearance="icon" id="remove-\${policy}">×</vscode-button>
                    \`;
                    container.appendChild(tag);
                    
                    document.getElementById(\`remove-\${policy}\`).addEventListener('click', () => {
                        selectedPolicies.delete(policy);
                        updatePolicyTags();
                    });
                });
            }

            // Policy selector
            document.getElementById('policySelector').addEventListener('change', (e) => {
                const value = e.target.value;
                if (value && !selectedPolicies.has(value)) {
                    selectedPolicies.add(value);
                    updatePolicyTags();
                    e.target.value = '';
                }
            });

            // Save button
            document.getElementById('saveButton').addEventListener('click', (e) => {
                e.preventDefault();
                const formData = {
                    accessorId: document.getElementById('accessorId').value,
                    secretId: document.getElementById('secretId').value,
                    description: document.getElementById('description').value,
                    policies: Array.from(selectedPolicies),
                    local: document.getElementById('local').checked,
                    expirationTime: document.getElementById('expirationTime').value,
                    expirationTTL: document.getElementById('expirationTTL').value
                };
                
                vscode.postMessage({
                    command: 'save',
                    data: formData
                });
            });

            // Cancel button
            document.getElementById('cancelButton').addEventListener('click', () => {
                vscode.postMessage({
                    command: 'cancel'
                });
            });
        </script>
    </body>
    </html>`;
}

export default (context: vscode.ExtensionContext, provider: ConsulTreeDataProvider): vscode.Disposable[] => {
    const add = vscode.commands.registerCommand('consul.acl.token.add', async (item: LoclTreeItem) => {
        try {
            const policies = await item.provider?.list_policy() || [];
            
            const panel = vscode.window.createWebviewPanel(
                'addToken',
                'Add ACL Token',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    localResourceRoots: [
                        vscode.Uri.joinPath(context.extensionUri, 'media', 'webview')
                    ]
                }
            );

            const toolkitUri = panel.webview.asWebviewUri(
                vscode.Uri.joinPath(context.extensionUri, 'media', 'webview', 'toolkit.bundle.js')
            );

            panel.webview.html = getWebviewContent(policies, toolkitUri);

            panel.webview.onDidReceiveMessage(
                async message => {
                    switch (message.command) {
                        case 'save':
                            try {
                                const data = message.data;
                                const opt = upperObj(data);
                                await item.provider?.add_token(opt);
                                vscode.window.showInformationMessage('Successfully added token');
                                panel.dispose();
                                provider.refresh();
                            } catch (error) {
                                vscode.window.showErrorMessage(`Failed to add token: ${error}`);
                            }
                            break;
                        case 'cancel':
                            panel.dispose();
                            break;
                    }
                },
                undefined,
                context.subscriptions
            );
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to add token: ${error}`);
        }
    });

    const del = vscode.commands.registerCommand('consul.acl.token.del', async (item: LoclTreeItem) => {
        try {
            const id = item.key;
            if (id) {
                await item.provider?.del_token(id);
                await item.provider?.refresh();
                vscode.window.showInformationMessage(`Successfully deleted token: ${id}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to delete token: ${error}`);
        }
    })
    return [add, del];
};
