import * as vscode from 'vscode'
import { compileSolidity, deployContract } from "../utils/solidityUtils";
var fs = require('fs')
var path = require('path')

export class ContractExplorerProvider implements vscode.TreeDataProvider<ContractItem> {
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

export class ContractDataItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly path: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly command?: vscode.Command
	) {
		super(label, collapsibleState)
	}

	contextValue = 'contractData'
}

export class ContractExplorer {

	private contractTreeView: vscode.TreeView<ContractItem>;

	constructor() {
		const treeDataProvider = new ContractExplorerProvider();
		this.contractTreeView = vscode.window.createTreeView('contract-explorer', { treeDataProvider });

		vscode.commands.registerCommand('contract-explorer.compileAll', () => {
			const files: string[] = treeDataProvider.contractFiles
			for(let file of files) {
				compileSolidity(file)
			}
		})
		vscode.commands.registerCommand('contract-explorer.deploy', async (contract: ContractItem) => {
			try {
				await deployContract(contract)
			} catch (e) {
				vscode.window.showInformationMessage(`Failed to deploy contract. ${e.message}!`)
			}
			vscode.window.showInformationMessage(`Contracts successfully deployed!`)
		})
	}

	private addContractData() {
		
	}

	private openFile(file: vscode.Uri): void {
		vscode.window.showTextDocument(file);
	}
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
