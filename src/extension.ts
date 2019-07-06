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
let accounts: string[]

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
	}).then(async blockchain_address => {
		if (blockchain_address) {
			try {
				web3 = new Web3Class(blockchain_address)
				accounts = await web3.eth.getAccounts()
				vscode.window.showInformationMessage(`Connected to blockchain on ${blockchain_address}!`)
			} catch (e) {
				vscode.window.showInformationMessage(`Failed to connect. ${e.message}`)
			}
		}
	})
}

async function deployContract(contract: ContractItem) {
	const compiledContracts: CompiledContract[] | undefined = compileSolidity(contract.path)
	if (compiledContracts) {
		try {
			for (let contract of compiledContracts) {
				const contractInstance = new web3.eth.Contract(contract.abi)
				const receipt = await contractInstance.deploy({ data: contract.bytecode, arguments: [] }).send({ from: accounts[0] })
				vscode.window.showInformationMessage(`Contract successfully deployed at ${receipt.address}!`)
			}
		} catch (e) {
			vscode.window.showInformationMessage(`Failed to deploy contract. ${e.message}!`)
		}
	}

}

function compileSolidity(filePath: string): CompiledContract[] | undefined {
	const filecontent: string = fs.readFileSync(filePath, 'utf8')
	const fileName: string = path.basename(filePath)
	const input = generateSolidityCompilerInput(path.basename(filePath), filecontent)
	const output = JSON.parse(solc.compile(JSON.stringify(input)))

	if (output.errors) {
		vscode.window.showErrorMessage(JSON.stringify(output.errors))
	} else {
		let contractData = []
		const contracts = output.contracts[fileName]
		for (let contractName in contracts) {
			contractData.push({
				abi: contracts[contractName].abi,
				bytecode: contracts[contractName].evm.bytecode.object
			})
		}
		return contractData
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