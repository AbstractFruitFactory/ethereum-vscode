import * as vscode from 'vscode'
import { getCompiledFiles, deployContract, getFunctionData, sendTransaction, waitForMined } from "../utils/Web3Utils"
import { CompiledContract } from '../types/CompiledContract'
import { Views, Commands } from "../types/ExtensionTypes"
import { Parameter } from "../types/ABITypes"
import { outputChannel } from '../extension'
const clipboardy = require('clipboardy')

export class SmartContractsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    public contractFiles: string[] = []

    private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>()
    readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event

    constructor() {
    }

    public refresh(element?: vscode.TreeItem): any {
        this._onDidChangeTreeData.fire(element);
    }

    getTreeItem(element: SmartContractItem): vscode.TreeItem {
        return element
    }

    public async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
        let items: vscode.TreeItem[] = []
        if (element) {
            const elementType = element.constructor.name
            switch (elementType) {
                case 'SmartContractItem':
                    items.push(new ContractDataItem('ABI', (element as SmartContractItem).contractData.abi))
                    items.push(new ContractDataItem('bytecode', (element as SmartContractItem).contractData.bytecode))
                    if ((element as SmartContractItem).deployedAddress) {
                        items.push(new MethodsItem(element as SmartContractItem))
                    }
                    break
                case 'MethodsItem':
                    const functions = getFunctionData((element as MethodsItem).parent.contractData.abi)
                    for (let func of functions) {
                        items.push(new MethodItem(func.name, func.inputs, element as MethodsItem, vscode.TreeItemCollapsibleState.None))
                    }
                    break
            }
        } else {
            const compiledFiles = getCompiledFiles()

            for (let compiledFile in compiledFiles) {
                items.push(new SmartContractItem(compiledFile, vscode.TreeItemCollapsibleState.Collapsed, compiledFiles[compiledFile]))
            }
        }

        return items
    }
}

export class MethodsItem extends vscode.TreeItem {
    contextValue = 'methods'

    constructor(
        public readonly parent: SmartContractItem,
        public readonly command?: vscode.Command
    ) {
        super('Methods', vscode.TreeItemCollapsibleState.Collapsed)
    }
}

export class MethodItem extends vscode.TreeItem {
    contextValue = 'method'

    constructor(
        public readonly label: string,
        public readonly params: Parameter[],
        public readonly parent: MethodsItem,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState)
    }
}

export class SmartContractItem extends vscode.TreeItem {
    contextValue = 'contract'
    deployedAddress: string = ""

    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contractData: CompiledContract,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState)
    }
}

export class ContractDataItem extends vscode.TreeItem {
    contextValue = 'contractData'

    constructor(
        public readonly label: string,
        public readonly data: any,
        public readonly command?: vscode.Command
    ) {
        super(label)
    }
}

export function refreshContractsView(element?: vscode.TreeItem) {
    treeDataProvider.refresh(element)
}

let contractsTreeView: vscode.TreeView<vscode.TreeItem>

const treeDataProvider = new SmartContractsProvider();
contractsTreeView = vscode.window.createTreeView(Views.SmartContracts, { treeDataProvider });

vscode.commands.registerCommand(Commands.Deploy, async (contract: SmartContractItem) => {
    try {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Deploying smart contract...',
            cancellable: false
        }, async (progress, token) => {
            progress.report({
                increment: 0
            })

            let transactionHash: string
            try {
                transactionHash = await deployContract(contract.contractData)
            } catch (error) {
                vscode.window.showErrorMessage(error.message)
                throw error
            }
            let receipt = await waitForMined(transactionHash)
            contract.deployedAddress = receipt.contractAddress as string
            refreshContractsView(contract)
            progress.report({
                increment: 100
            })
            outputChannel.show()
            outputChannel.appendLine(`---------------------------------------`)
            outputChannel.appendLine(`${contract.label} deployed.`)
            outputChannel.appendLine(`- address: ${receipt.contractAddress}`)
            outputChannel.appendLine(`- transaction hash: ${receipt.transactionHash}`)
            outputChannel.appendLine(`---------------------------------------`)
            outputChannel.appendLine('')
            return transactionHash
        })
    } catch (e) {
        vscode.window.showInformationMessage(`Failed to deploy contract. ${e.message}!`)
    }
})

vscode.commands.registerCommand(Commands.SendTransaction, async (contract: MethodItem) => {
    try {
        const transactionHash = await showSendTransactionInputBox(contract)
        if (transactionHash) {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Sending transaction...',
                cancellable: false
            }, async (progress, token) => {
                progress.report({
                    increment: 0
                })
                outputChannel.show()
                outputChannel.appendLine(`Transaction sent: ${transactionHash}`)
                await waitForMined(transactionHash)
                progress.report({
                    increment: 100
                })
                outputChannel.appendLine(`... Transaction mined.`)
                outputChannel.appendLine('')
            })
        }
    } catch (e) {
        vscode.window.showInformationMessage(`${e.message}`)
    }
})

vscode.commands.registerCommand(Commands.CopyContractData, (contract: ContractDataItem) => {
    let data: string
    if (contract.label === 'ABI') {
        data = JSON.stringify(contract.data)
    } else {
        data = contract.data
    }
    clipboardy.writeSync(data)
    vscode.window.showInformationMessage(`${contract.label} copied!`)
})

async function showSendTransactionInputBox(contract: MethodItem): Promise<string | undefined> {
    if (!contract.params[0]) {
        try {
            let transactionHash = await sendTransaction(
                contract.parent.parent.contractData.abi,
                contract.parent.parent.contractData.bytecode,
                contract.parent.parent.deployedAddress,
                contract.label
            )
            return transactionHash
        } catch (error) {
            vscode.window.showErrorMessage(error)
            throw error
        }
    } else {
        let placeHolder = ''
        for (let param of contract.params) {
            placeHolder += `${param.type}, `
        }
        placeHolder = placeHolder.slice(0, -2)

        const input: string | undefined = await vscode.window.showInputBox({
            placeHolder
        })

        if (!input) {
            return undefined
        }

        let inputArray: string[] = input.split(',')

        try {
            let transactionHash = await sendTransaction(
                contract.parent.parent.contractData.abi,
                contract.parent.parent.contractData.bytecode,
                contract.parent.parent.deployedAddress,
                contract.label,
                inputArray
            )
            return transactionHash
        } catch (error) {
            vscode.window.showErrorMessage(error)
            throw error
        }
    }
}