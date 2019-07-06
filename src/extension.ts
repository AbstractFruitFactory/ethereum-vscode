'use strict';
import * as vscode from 'vscode';
import { ToolsProvider } from './views/Tools'
import { ContractExplorerProvider, ContractExplorer } from './views/ContractExplorer'
import { connectToBlockchain } from './utils/solidityUtils';

export function activate(context: vscode.ExtensionContext) {
	const toolsProvider = new ToolsProvider()
	new ContractExplorer()
	vscode.window.registerTreeDataProvider('tools', toolsProvider)
	vscode.commands.registerCommand('extension.InputRPCEndpoint', () => {
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

