'use strict'
import * as vscode from 'vscode';
import { ToolsProvider } from './views/Tools'
import { connectToBlockchain, getCompiledFiles, getEventData, decodeEvent } from './utils/Web3Utils'
import { Commands } from "./types/ExtensionTypes"
import { CompiledContract } from './types/CompiledContract';
import "./views/SmartContracts"
import "./views/SolidityFiles"
import { Event } from './types/ABITypes';


export function activate(context: vscode.ExtensionContext) {
	const toolsProvider = new ToolsProvider()
	vscode.window.registerTreeDataProvider('tools', toolsProvider)
	vscode.commands.registerCommand(Commands.InputRPCEndpoint, () => {
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
}

