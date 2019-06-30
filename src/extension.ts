'use strict';
import Web3 from "web3"
const Web3Class = require('web3')
var path = require('path')
var fs = require('fs')
var solc = require('solc')
import * as vscode from 'vscode';
import { ToolsProvider } from './views/Tools'
import { ContractExplorer, ContractItem } from './views/ContractExplorer'
import { CompiledContract } from "./types/CompiledContract";

var web3: Web3 

export function activate(context: vscode.ExtensionContext) {
	const toolsProvider = new ToolsProvider()
	const contractExplorerProvider = new ContractExplorer()
	vscode.window.registerTreeDataProvider('tools', toolsProvider)
	vscode.window.registerTreeDataProvider('contract-explorer', contractExplorerProvider)
	vscode.commands.registerCommand('extension.InputRPCEndpoint', connectToBlockchain)
	/*vscode.commands.registerCommand('contract-explorer.compileAll', () => {
		const files: string[] = contractExplorerProvider.contractFiles
		compileSolidity(files)
	})*/
	vscode.commands.registerCommand('contract-explorer.deploy', deployContract)
}

function connectToBlockchain() {
	vscode.window.showInputBox({
		value: 'http://127.0.0.1:8545',
		placeHolder: 'Enter blockchain endpoint...'
	}).then((blockchain_address: string | undefined) => {
		if (blockchain_address) {
			console.log(blockchain_address)
			web3 = new Web3Class(new Web3Class.providers.HttpProvider(blockchain_address))
			console.log(web3.eth.accounts.wallet)
			vscode.window.showInformationMessage(`Connected to blockchain on ${blockchain_address}!`)
		}
	})
}

function deployContract(contract: ContractItem) {
	const compiledContract: CompiledContract | undefined = compileSolidity(contract.path)
	if(compiledContract) {
		let contract
		try {
			contract = new web3.eth.Contract(compiledContract.abi)
			contract.deploy({ data: compiledContract.bytecode }).send({ from: web3.eth.accounts.wallet[0].address })
		} catch (e) {
			console.log(e.message)
		}
	}
	
}

// Make this support several contracts in one solidity file
function compileSolidity(filePath: string): CompiledContract | undefined {
	const filecontent: string = fs.readFileSync(filePath, 'utf8')
	const fileName: string = path.basename(filePath)
	const input = generateSolidityCompilerInput(path.basename(filePath), filecontent)
	const output = JSON.parse(solc.compile(JSON.stringify(input)))
	if (output.errors) {
		vscode.window.showErrorMessage(JSON.stringify(output.errors))
	} else {
		return {
			abi: output.contracts[fileName].Test.abi,
			bytecode: output.contracts[fileName].Test.evm.bytecode.object
		}
	}
}

function generateSolidityCompilerInput(filename: string, filecontent: string) {
	return {
		language: 'Solidity',
		sources: {
			[filename]: {
				content: filecontent
			}
		},
		settings: {
			outputSelection: {
				'*': {
					'*': ['*']
				}
			}
		}
	}
}