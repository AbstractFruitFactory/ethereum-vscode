import * as vscode from 'vscode'
import { Commands, Views } from "../types/ExtensionTypes"
import { CompiledContract } from '../types/CompiledContract';
import { Event, Function } from '../types/ABITypes';
import { getCompiledFiles, getEventData, decodeEvent, connectToBlockchain, getTransactionReceipt, getFunctionData, encodeFunctionSignature, encodeEventSignature, encodeParameter, sendTransaction, isConnected } from '../utils/Web3Utils'
import { outputChannel } from '../extension'

export class ToolsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>()
    readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event

    constructor() {
    }

    public refresh(element?: vscode.TreeItem): any {
        this._onDidChangeTreeData.fire(element);
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
					items.push(new Web3Item('encodeEventSignature', vscode.TreeItemCollapsibleState.None, {
						command: Commands.EncodeEventSignature,
						title: ''
					}))
					items.push(new Web3Item('encodeParameter', vscode.TreeItemCollapsibleState.None, {
						command: Commands.EncodeParameter,
						title: ''
					}))
			}
		} else {
			items.push(new Web3Item('Connect', vscode.TreeItemCollapsibleState.None, {
				command: Commands.InputRPCEndpoint,
				title: ''
			}))
			items.push(new Web3Item('abi', vscode.TreeItemCollapsibleState.Collapsed))
			if (await isConnected()) {
				items.push(new Web3Item('getTransactionReceipt', vscode.TreeItemCollapsibleState.None, {
					command: Commands.GetTransactionReceipt,
					title: ''
				}))
				items.push(new Web3Item('sendTransaction', vscode.TreeItemCollapsibleState.None, {
					command: Commands.SendTransactionUsingABI,
					title: ''
				}))
			}
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

export function refreshToolsView(element?: vscode.TreeItem) {
    treeDataProvider.refresh(element)
}

let toolsTreeView: vscode.TreeView<vscode.TreeItem>

const treeDataProvider = new ToolsProvider();
toolsTreeView = vscode.window.createTreeView(Views.Tools, { treeDataProvider });


vscode.commands.registerCommand(Commands.DecodeLog, async () => {
	const compiledContracts = getCompiledFiles()
	
	const contractName: string | undefined = await vscode.window.showQuickPick(Object.keys(compiledContracts), {
		placeHolder: 'Choose a smart contract...'
	})
	if (!contractName) return

	const { chosenEventName, eventNames } = await showEventPicker(compiledContracts[contractName])
	if (!chosenEventName) return

	const eventData: string | undefined = await vscode.window.showInputBox({
		placeHolder: 'Input event data...'
	})
	if (!eventData) return

	const event: Event = eventNames[chosenEventName]

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
				refreshToolsView()
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
	const { contractName, compiledContracts } = await showSmartContractPicker()

	if (!contractName) return

	let contract: CompiledContract = compiledContracts[contractName]

	const { chosenFunctionName, functionNames } = await showFunctionPicker(contract)

	if (!chosenFunctionName) return

	let functionData: Function = functionNames[chosenFunctionName]
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
	outputChannel.appendLine(`encodeFunctionSignature: ${functionSignature} => ${encodedSignature}`)
	outputChannel.appendLine('')
})

vscode.commands.registerCommand(Commands.EncodeEventSignature, async () => {
	const { contractName, compiledContracts } = await showSmartContractPicker()
	if (!contractName) return

	let contract: CompiledContract = compiledContracts[contractName]

	const { chosenEventName, eventNames } = await showEventPicker(contract)
	if (!chosenEventName) return

	let eventData: Event = eventNames[chosenEventName]
	let eventSignature = `${eventData.name}(`
	for (let input of eventData.inputs) {
		eventSignature += `${input.type},`
	}
	eventSignature = eventSignature.slice(0, -1)
	eventSignature += ')'
	let encodedSignature
	try {
		encodedSignature = encodeEventSignature(eventSignature)
	} catch (error) {
		vscode.window.showErrorMessage(error.message)
		throw error
	}
	outputChannel.show()
	outputChannel.appendLine(`encodeEventSignature: ${eventSignature} => ${encodedSignature}`)
	outputChannel.appendLine('')
})

vscode.commands.registerCommand(Commands.EncodeParameter, async () => {
	const type: string | undefined = await vscode.window.showInputBox({
		placeHolder: 'Enter type (example: bytes32)'
	})
	if (!type) return
	const value: string | undefined = await vscode.window.showInputBox({
		placeHolder: 'Enter value'
	})
	if (!value) return

	let encoded: string
	try {
		encoded = encodeParameter(type, value)
	} catch (error) {
		vscode.window.showErrorMessage(error.message)
		throw error
	}

	outputChannel.show()
	outputChannel.appendLine(`encodeParameter: (${type}, ${value}) => ${encoded}`)
	outputChannel.appendLine('')
})

vscode.commands.registerCommand(Commands.SendTransactionUsingABI, async () => {
	let abi = await vscode.window.showInputBox({
		placeHolder: 'Enter ABI...'
	})
	if (!abi) return

	let abiParsed: any[]
	try {
		abiParsed = JSON.parse(abi)
	} catch (error) {
		vscode.window.showErrorMessage(`Invalid ABI. ${error.message}`)
		throw error
	}

	const bytecode: string | undefined = await vscode.window.showInputBox({
		placeHolder: 'Enter bytecode...'
	})
	if (!bytecode) return

	const address: string | undefined = await vscode.window.showInputBox({
		placeHolder: 'Enter contract address...'
	})
	if (!address) return

	const functions: Function[] = getFunctionData(abiParsed)
	let functionNames: { [key: string]: Function } = {}
	for (let func of functions) {
		functionNames[func.name] = func
	}

	const functionName: string | undefined = await vscode.window.showQuickPick(Object.keys(functionNames), {
		placeHolder: 'Select function...'
	})
	if (!functionName) return

	if (functionNames[functionName].inputs[0]) {
		let placeHolder = ''
		for (let param of functionNames[functionName].inputs) {
			placeHolder += `${param.type}, `
		}
		placeHolder = placeHolder.slice(0, -2)
		const inputs: string | undefined = await vscode.window.showInputBox({
			placeHolder
		})
		if (!inputs) return

		let inputArray: string[] = inputs.split(',')
		try {
			await sendTransaction(abiParsed, bytecode, address, functionName, inputArray)
		} catch (error) {
			vscode.window.showErrorMessage(error.message)
		}
	} else {
		try {
			await sendTransaction(abiParsed, bytecode, address, functionName)
		} catch (error) {
			vscode.window.showErrorMessage(error.message)
		}
	}
})

async function showSmartContractPicker() {
	const compiledContracts = getCompiledFiles()
	
	const contractName: string | undefined = await vscode.window.showQuickPick(Object.keys(compiledContracts), {
		placeHolder: 'Choose a smart contract...'
	})
	return { contractName, compiledContracts }
}

async function showFunctionPicker(contract: CompiledContract) {
	const functions = getFunctionData(contract.abi)

	let functionNames: { [key: string]: Function } = {}
	for (let func of functions) {
		functionNames[func.name] = func
	}

	const chosenFunctionName: string | undefined = await vscode.window.showQuickPick(Object.keys(functionNames), {
		placeHolder: 'Choose a function...'
	})
	return { chosenFunctionName, functionNames }
}


async function showEventPicker(contract: CompiledContract) {
	let events: Event[] = []
	events = getEventData(contract.abi)
	let eventNames: { [key: string]: Event } = {}
	for (let event of events) {
		eventNames[event.name] = event
	}
	const chosenEventName: string | undefined = await vscode.window.showQuickPick(Object.keys(eventNames), {
		placeHolder: 'Choose an event...'
	})
	return { chosenEventName, eventNames }
}