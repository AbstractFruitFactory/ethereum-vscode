'use strict'
import * as vscode from 'vscode';
import { ToolsProvider } from './views/Tools'
import { ContractExplorerProvider, SolidityFileExplorer } from './views/SolidityFiles'
import { connectToBlockchain } from './utils/solidityUtils'
import { Commands } from "./types/ExtensionTypes";


export function activate(context: vscode.ExtensionContext) {
	const toolsProvider = new ToolsProvider()
	new SolidityFileExplorer()
	vscode.window.registerTreeDataProvider('tools', toolsProvider)
	vscode.commands.registerCommand(Commands.InputRPCEndpoint, () => {
		vscode.window.showInputBox({
			value: 'http://127.0.0.1:8545',
			placeHolder: 'Enter blockchain endpoint...'
		}).then(async blockchain_address => {
			if (blockchain_address) {
				try {
					await connectToBlockchain(blockchain_address)
				} catch (e) {
					vscode.window.showInformationMessage(`Failed to connect. ${e.message}`)
				}
				vscode.window.showInformationMessage(`Connected to blockchain on ${blockchain_address}!`)
			}
		})
	})
}

