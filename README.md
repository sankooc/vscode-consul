# VSCode for Consul

<p align="center">
  <a href="/">
    <img src="https://img.shields.io/github/license/sankooc/vscode-consul" alt="License">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=sankooc.vscode-consul">
    <img src="https://img.shields.io/visual-studio-marketplace/i/sankooc.vscode-consul" alt="Install Count">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=sankooc.vscode-consul">
    <img src="https://img.shields.io/visual-studio-marketplace/d/sankooc.vscode-consul" alt="Download Count">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=sankooc.vscode-consul">
    <img src="https://img.shields.io/visual-studio-marketplace/last-updated/sankooc.vscode-consul" alt="Last Updated">
  </a>
  <a href="/">
    <img src="https://img.shields.io/visual-studio-marketplace/stars/sankooc.vscode-consul" alt="Marketplace Stars">
  </a>
</p>

**VSCode for Consul** is a Visual Studio Code extension that integrates HashiCorp Consul functionalities directly into your IDE, enabling seamless service discovery and configuration management.


![](https://i.ibb.co/B5K4L6fp/vsc-2.png)

## Features

- **Consul Instances Management**: Add, remove, connect, and disconnect Consul instances directly from the VS Code interface.
- **Key/Value Store Management**: Perform CRUD operations on Consul's KV store with ease.
- **Catalog Browsing**: Explore and view details of services and nodes registered in Consul's catalog.
- **Configuration Interface**: Provides a configuration page for Consul instances that are not yet connected, allowing you to set connection options with save, cancel, and test connection functionalities.
- **Snapshot Management**: Create and restore Consul snapshots with improved UI navigation.
- **ACL Management**: Comprehensive management of Consul ACL tokens and roles with safety confirmations.

## Usage

- **Manage Consul Instances**: 
  - Use the activity bar to add or remove Consul instances
  - Confirmation dialog ensures safety when deleting instances
- **Explore Catalog**: Navigate through the Consul catalog to view services and nodes
- **Edit KV Pairs**: Select a KV leaf node to open an editor for modifying key-value pairs
- **Configure Instances**: Click the configuration button on disconnected instances to open the settings page
- **Manage Snapshots**: 
  - Create snapshots of your Consul configuration
  - Restore configurations from existing snapshots
- **ACL Management**:
  - Create and manage ACL tokens and roles
  - Safe deletion with confirmation dialogs
  - Fine-grained access control

## Requirements

- Visual Studio Code version 1.86.2 or higher.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Thanks to the developers of [HashiCorp Consul](https://www.consul.io/) for providing a robust service discovery and configuration tool.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

**Enjoy!**
