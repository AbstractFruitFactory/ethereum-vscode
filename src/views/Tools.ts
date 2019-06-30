import * as vscode from 'vscode';

export class ToolsProvider implements vscode.TreeDataProvider<Web3Item> {

	constructor() {
	}

	getTreeItem(element: Web3Item): vscode.TreeItem {
		return element;
	}

	public async getChildren() {
		return [new Web3Item('Connect', vscode.TreeItemCollapsibleState.None, {
			command: 'extension.InputRPCEndpoint',
			title: ''
		})]
	}
}

export class Web3Item extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly command?: vscode.Command
	) {
		super(label, collapsibleState);
	}
}

