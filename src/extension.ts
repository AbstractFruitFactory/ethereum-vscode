'use strict'
import * as vscode from 'vscode';
import { ToolsProvider } from './views/Tools'
import { connectToBlockchain, getCompiledFiles, getEventData, decodeEvent } from './utils/Web3Utils'
import { Commands } from "./types/ExtensionTypes"
import { CompiledContract } from './types/CompiledContract';
import "./views/SmartContracts"
import "./views/SolidityFiles"
import { Event } from './types/ABITypes';

let outputChannel: vscode.OutputChannel

export function activate(context: vscode.ExtensionContext) {
	const toolsProvider = new ToolsProvider()
	outputChannel = vscode.window.createOutputChannel('EthereumDevTools')
	vscode.window.registerTreeDataProvider('tools', toolsProvider)
	vscode.commands.registerCommand(Commands.InputRPCEndpoint, () => {
		vscode.window.showInputBox({
			value: 'http://127.0.0.1:8545',
			placeHolder: 'Enter blockchain url...'
		}).then(async blockchain_address => {
			if (blockchain_address) {
				try {
					await connectToBlockchain(blockchain_address)
					vscode.window.showInformationMessage(`Connected to blockchain on ${blockchain_address}!`)
				} catch (e) {
					vscode.window.showInformationMessage(`Failed to connect. ${e.message}`)
				}
			}
		})
	})
}

export { outputChannel }



