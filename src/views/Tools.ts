import * as vscode from 'vscode'
import { Commands } from "../types/ExtensionTypes"
import { CompiledContract } from '../types/CompiledContract';
import { Event, Function } from '../types/ABITypes';
import { getCompiledFiles, getEventData, decodeEvent, connectToBlockchain, getTransactionReceipt, getFunctionData, encodeFunctionSignature } from '../utils/Web3Utils'
import { outputChannel } from '../extension'

export class ToolsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {

	constructor() {
	}

	getTreeItem(element: Web3Item): vscode.TreeItem {
		return element;
	}

	public async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
		let items: vscode.TreeItem[] = []

		if (element) {
			switch (element.label) {
				case 'abi':
					items.push(new Web3Item('decodeLog', vscode.TreeItemCollapsibleState.None, {
						command: Commands.DecodeLog,
						title: ''
					}))
					items.push(new Web3Item('encodeFunctionSignature', vscode.TreeItemCollapsibleState.None, {
						command: Commands.EncodeFunctionSignature,
						title: ''
					}))
			}
		} else {
			items.push(new Web3Item('Connect', vscode.TreeItemCollapsibleState.None, {
				command: Commands.InputRPCEndpoint,
				title: ''
			}))
			items.push(new Web3Item('abi', vscode.TreeItemCollapsibleState.Collapsed))
			items.push(new Web3Item('getTransactionReceipt', vscode.TreeItemCollapsibleState.None, {
				command: Commands.GetTransactionReceipt,
				title: ''
			}))
		}
		return items
	}
}

class Web3Item extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly command?: vscode.Command
	) {
		super(label, collapsibleState);
	}
}


vscode.commands.registerCommand(Commands.DecodeLog, async () => {
	const compiledContracts: CompiledContract[] = getCompiledFiles()
	const compiledContractNames: string[] = []
	for (let contract of compiledContracts) {
		compiledContractNames.push(contract.name)
	}
	const contract: string | undefined = await vscode.window.showQuickPick(compiledContractNames, {
		placeHolder: 'Choose a smart contract...'
	})
	if (!contract) {
		return
	}
	let events: Event[] = []
	for (let compiledContract of compiledContracts) {
		if (compiledContract.name === contract) {
			events = getEventData(compiledContract.abi)
		}
	}
	let eventNames: { [key: string]: any } = {}
	for (let event of events) {
		eventNames[event.name] = event
	}
	const eventName: string | undefined = await vscode.window.showQuickPick(Object.keys(eventNames), {
		placeHolder: 'Choose an event...'
	})

	if (!eventName) {
		return
	}

	const eventData: string | undefined = await vscode.window.showInputBox({
		placeHolder: 'Input event data...'
	})

	if (!eventData) {
		return
	}

	const event: Event = eventNames[eventName]

	const decodedEvent = decodeEvent(event, eventData)
	outputChannel.show()
	outputChannel.appendLine(JSON.stringify(decodedEvent, null, 2))
	outputChannel.appendLine('')
})

vscode.commands.registerCommand(Commands.InputRPCEndpoint, () => {
	vscode.window.showInputBox({
		value: 'http://127.0.0.1:8545',
		placeHolder: 'Enter blockchain url...'
	}).then(async blockchain_address => {
		if (blockchain_address) {
			try {
				await connectToBlockchain(blockchain_address)
				vscode.window.showInformationMessage(`Connected to blockchain on ${blockchain_address}!`)
			} catch (error) {
				vscode.window.showInformationMessage(`Failed to connect. ${error.message}`)
			}
		}
	})
})

vscode.commands.registerCommand(Commands.GetTransactionReceipt, () => {
	vscode.window.showInputBox({
		placeHolder: 'Enter transaction hash...'
	}).then(async transactionHash => {
		if (transactionHash) {
			try {
				const receipt = await getTransactionReceipt(transactionHash)
				outputChannel.show()
				outputChannel.appendLine(JSON.stringify(receipt, null, 2))
				outputChannel.appendLine('')
			} catch (error) {
				vscode.window.showErrorMessage(error.message)
			}
		}
	})
})

vscode.commands.registerCommand(Commands.EncodeFunctionSignature, async () => {
	const compiledContracts: CompiledContract[] = getCompiledFiles()
	const compiledContractsNames: { [key: string]: CompiledContract } = {}
	for (let contract of compiledContracts) {
		compiledContractsNames[contract.name] = contract
	}
	const contractName: string | undefined = await vscode.window.showQuickPick(Object.keys(compiledContractsNames), {
		placeHolder: 'Choose a smart contract...'
	})

	if (!contractName) return

	let contract: CompiledContract = compiledContractsNames[contractName]

	const functions = getFunctionData(contract.abi)

	let functionNames: { [key: string]: Function } = {}
	for (let func of functions) {
		functionNames[func.name] = func
	}

	const functionName: string | undefined = await vscode.window.showQuickPick(Object.keys(functionNames), {
		placeHolder: 'Choose a function...'
	})

	if (!functionName) return

	let functionData: Function = functionNames[functionName]
	let functionSignature = `${functionData.name}(`
	for (let input of functionData.inputs) {
		functionSignature += `${input.type},`
	}
	functionSignature = functionSignature.slice(0, -1)
	functionSignature += ')'
	let encodedSignature
	try {
		encodedSignature = encodeFunctionSignature(functionSignature)
	} catch (error) {
		vscode.window.showErrorMessage(error.message)
		throw error
	}
	outputChannel.show()
	outputChannel.appendLine(`Encoded function signature: ${encodedSignature}`)
	outputChannel.appendLine('')
})