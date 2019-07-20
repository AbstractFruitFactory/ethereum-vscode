import * as vscode from 'vscode'
import { Commands } from "../types/ExtensionTypes"
import { CompiledContract } from '../types/CompiledContract';
import { Event } from '../types/ABITypes';
import { getCompiledFiles, getEventData, decodeEvent, connectToBlockchain, getTransactionReceipt } from '../utils/Web3Utils';
import { outputChannel } from '../extension';

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
	console.log(decodedEvent)

	/*

	const options: { [key: string]: (context: vscode.ExtensionContext) => Promise<void> } = {
		showContractEvents
	};
	const quickPick = vscode.window.createQuickPick();
	quickPick.items = Object.keys(options).map(label => ({ label }));
	quickPick.onDidChangeSelection(selection => {
		if (selection[0]) {
			options[selection[0].label](context)
				.catch(console.error);
		}
	});
	quickPick.onDidHide(() => quickPick.dispose());
	quickPick.show();

	*/
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
			} catch (e) {
				vscode.window.showInformationMessage(`Failed to connect. ${e.message}`)
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
				outputChannel.appendLine(`${receipt}`)
			} catch (error) {
				vscode.window.showErrorMessage(error.message)
			}
		}
	})
})