import * as vscode from 'vscode'
var fs = require('fs')
var path = require('path')

export class ContractExplorer implements vscode.TreeDataProvider<ContractItem> {
	public contractFiles: string[] = []

	constructor() {
	}

	getTreeItem(element: ContractItem): vscode.TreeItem {
		return element
	}

	public async getChildren(): Promise<ContractItem[]> {
		let files: string[] = findAllSolidityFiles()
		this.contractFiles = files
		let contractItems: ContractItem[] = []
		files.forEach(file => {
			contractItems.push(new ContractItem(path.basename(file), file, vscode.TreeItemCollapsibleState.None))
		})
		return contractItems
	}
}

export class ContractItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly path: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly command?: vscode.Command
	) {
		super(label, collapsibleState)
	}

	contextValue = 'contract'
}

function findAllSolidityFiles(): string[] {
	const rootPath = vscode.workspace.rootPath
	let files: string[] = []
	if (rootPath) {
		files = searchFiles(rootPath, /\.*.sol/)
	}
	return files
}

function searchFiles(dir: string, pattern: RegExp = /\.*/, filelist: string[] = []): string[] {
	let files = fs.readdirSync(dir)
	files.forEach(function (file: string) {
		const filePath: string = `${dir}/${file}`
		if (fs.statSync(filePath).isDirectory()) {
			filelist = searchFiles(filePath, pattern, filelist)
		}
		else if (pattern.test(file)) {
			filelist.push(filePath)
		}
	})
	return filelist
}
