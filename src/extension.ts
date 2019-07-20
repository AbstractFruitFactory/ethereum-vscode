'use strict'
import * as vscode from 'vscode';
import { ToolsProvider } from './views/Tools'
import "./views/SmartContracts"
import "./views/SolidityFiles"

let outputChannel: vscode.OutputChannel

export function activate(context: vscode.ExtensionContext) {
	const toolsProvider = new ToolsProvider()
	outputChannel = vscode.window.createOutputChannel('EthereumDevTools')
	vscode.window.registerTreeDataProvider('tools', toolsProvider)
}

export { outputChannel }



