import * as vscode from 'vscode'
import { compileSolidity } from "../utils/Web3Utils";
import { refreshContractsView } from "./SmartContracts";
import { Commands, Views } from "../types/ExtensionTypes";
var fs = require('fs')
var path = require('path')

const openedFilePaths: string[] = []

export class SolidityFilesProvider implements vscode.TreeDataProvider<SolidityFile> {
	public contractFiles: string[] = []

	private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>()
	readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event

	constructor() {
	}

	public refresh(element?: vscode.TreeItem): any {
		this._onDidChangeTreeData.fire(element);
	}

	getTreeItem(element: SolidityFile): vscode.TreeItem {
		return element
	}

	public async getChildren(): Promise<SolidityFile[]> {
		let files: string[] = findAllSolidityFiles()
		this.contractFiles = files
		let contractItems: SolidityFile[] = []
		files.forEach(file => {
			contractItems.push(new SolidityFile(path.basename(file), file, vscode.TreeItemCollapsibleState.None, {
				command: Commands.OpenFileView,
				title: '',
				arguments: [file]
			}))
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

async function openFile(file: vscode.Uri) {
	await vscode.window.showTextDocument(file);
}

export function refreshFileView(element?: vscode.TreeItem) {
	treeDataProvider.refresh(element)
}

function findAllSolidityFiles(): string[] {
	const rootPath = vscode.workspace.rootPath
	let files: string[] = []
	if (rootPath) {
		files = searchFiles(rootPath, /\.*.sol/)
	}
	files = files.concat(openedFilePaths)
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

vscode.commands.registerCommand(Commands.OpenSolidityFile, async () => {
	const filePaths: vscode.Uri[] | undefined = await vscode.window.showOpenDialog({
		canSelectFiles: true,
		canSelectMany: true,
		filters: {
			Solidity: ['sol']
		},

	})
	if (!filePaths) return

	for (let path of filePaths) {
		openedFilePaths.push(path.fsPath)
	}

	refreshFileView()
})

vscode.commands.registerCommand(Commands.OpenFileView, async (filePath: string) => {
	try {
		await openFile(vscode.Uri.file(filePath))
	} catch (error) {
		vscode.window.showErrorMessage(error.message)
	}
})

vscode.commands.registerCommand(Commands.Compile, (file: SolidityFile) => {
	compileSolidity(file.path)
	refreshContractsView()
})