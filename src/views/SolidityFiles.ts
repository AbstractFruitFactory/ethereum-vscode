import * as vscode from 'vscode'
import { compileSolidity } from "../utils/solidityUtils";
import { refreshContractsView } from "./SmartContracts";
import { Commands, Views } from "../types/ExtensionTypes";
var fs = require('fs')
var path = require('path')

export class SolidityFilesProvider implements vscode.TreeDataProvider<SolidityFile> {
	public contractFiles: string[] = []

	constructor() {
	}

	getTreeItem(element: SolidityFile): vscode.TreeItem {
		return element
	}

	public async getChildren(): Promise<SolidityFile[]> {
		let files: string[] = findAllSolidityFiles()
		this.contractFiles = files
		let contractItems: SolidityFile[] = []
		files.forEach(file => {
			contractItems.push(new SolidityFile(path.basename(file), file, vscode.TreeItemCollapsibleState.None))
		})

		return contractItems
	}
}

export class SolidityFile extends vscode.TreeItem {
	contextValue = 'file'

	constructor(
		public readonly label: string,
		public readonly path: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly command?: vscode.Command
	) {
		super(label, collapsibleState)
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

let solFileTreeView: vscode.TreeView<SolidityFile>

const treeDataProvider = new SolidityFilesProvider();
solFileTreeView = vscode.window.createTreeView<SolidityFile>(Views.SolidityFiles, { treeDataProvider });

vscode.commands.registerCommand(Commands.CompileAll, () => {
	const files: string[] = treeDataProvider.contractFiles
	for (let file of files) {
		compileSolidity(file)
	}
	refreshContractsView()
})

/*
vscode.commands.registerCommand(Commands.Deploy, async (contract: SolidityFile) => {
	try {
		await deployContract(contract)
	} catch (e) {
		vscode.window.showInformationMessage(`Failed to deploy contract. ${e.message}!`)
	}
	vscode.window.showInformationMessage(`Contracts successfully deployed!`)
})
*/