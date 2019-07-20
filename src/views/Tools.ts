import * as vscode from 'vscode'
import { Commands } from "../types/ExtensionTypes"
import { CompiledContract } from '../types/CompiledContract';
import { Event } from '../types/ABITypes';
import { getCompiledFiles, getEventData, decodeEvent } from '../utils/Web3Utils';



export class ToolsProvider implements vscode.TreeDataProvider<Web3Item> {

	constructor() {
	}

	getTreeItem(element: Web3Item): vscode.TreeItem {
		return element;
	}

	public async getChildren(element?: Web3Item): Promise<Web3Item[]>  {
		if(element) {
			switch (element.label) {
				case 'Connect':
					return []
				case 'abi':
					return [new Web3Item('decodeLog', vscode.TreeItemCollapsibleState.None, {
						command: Commands.DecodeLog,
						title: ''
					})]
			}
		}

		return [
			new Web3Item('Connect', vscode.TreeItemCollapsibleState.None, {
				command: Commands.InputRPCEndpoint,
				title: ''
			}),
			new Web3Item('abi', vscode.TreeItemCollapsibleState.Collapsed)
		]
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

	if(!eventData) {
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