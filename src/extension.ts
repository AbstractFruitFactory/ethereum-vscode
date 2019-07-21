'use strict'
import * as vscode from 'vscode'
import "./views/SmartContracts"
import "./views/SolidityFiles"
import "./views/Tools"

let outputChannel: vscode.OutputChannel

export function activate(context: vscode.ExtensionContext) {
	outputChannel = vscode.window.createOutputChannel('EthereumDevTools')
}

export { outputChannel }



