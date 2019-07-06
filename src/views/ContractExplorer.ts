import * as vscode from 'vscode'
import { compileSolidity, deployContract, getCompiledFiles } from "../utils/solidityUtils";
import { CompiledContract } from '../types/CompiledContract';
var fs = require('fs')
var path = require('path')

export class ContractExplorerProvider implements vscode.TreeDataProvider<ContractItem | ContractDataItem> {
	public contractFiles: string[] = []

	private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>()
	readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event


	constructor() {
	}

	public refresh(): any {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: ContractItem): vscode.TreeItem {
		return element
	}

	public async getChildren(element?: ContractItem): Promise<ContractItem[] | ContractDataItem[]> {
		function isCompiled(filePath: string) {

		}
		if (element && element.contractData) {
			return [
				new ContractDataItem('ABI', element.contractData.abi),
				new ContractDataItem('bytecode', element.contractData.bytecode)
			]
		}

		let files: string[] = findAllSolidityFiles()
		this.contractFiles = files
		let contractItems: ContractItem[] = []
		const compiledFiles = getCompiledFiles()

		files.forEach(file => {
			let isCompiled: boolean = false
			for (let compiledFile of compiledFiles) {
				if (compiledFile.filePath === file) {
					contractItems.push(new ContractItem(path.basename(file), file, vscode.TreeItemCollapsibleState.Collapsed, compiledFile))
					isCompiled = true
				}
			}
			if (!isCompiled) {
				contractItems.push(new ContractItem(path.basename(file), file, vscode.TreeItemCollapsibleState.None))
			}
		})
		return contractItems
	}
}

export class ContractItem extends vscode.TreeItem {
	contextValue = 'contract'

	constructor(
		public readonly label: string,
		public readonly path: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly contractData?: CompiledContract,
		public readonly command?: vscode.Command
	) {
		super(label, collapsibleState)
	}
}

export class ContractDataItem extends vscode.TreeItem {
	contextValue = 'contractData'

	constructor(
		public readonly label: string,
		public readonly data: any,
		public readonly command?: vscode.Command
	) {
		super(label)
	}
}

export class ContractExplorer {

	private contractTreeView: vscode.TreeView<ContractItem | ContractDataItem>

	constructor() {
		const treeDataProvider = new ContractExplorerProvider();
		this.contractTreeView = vscode.window.createTreeView<ContractItem | ContractDataItem>('contract-explorer', { treeDataProvider });

		vscode.commands.registerCommand('contract-explorer.compileAll', () => {
			const files: string[] = treeDataProvider.contractFiles
			for (let file of files) {
				compileSolidity(file)
				treeDataProvider.refresh()
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