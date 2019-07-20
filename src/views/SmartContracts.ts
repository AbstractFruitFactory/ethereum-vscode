import * as vscode from 'vscode'
import { getCompiledFiles, deployContract, getFunctionData, sendTransaction, getTransactionReceiptMined } from "../utils/Web3Utils"
import { CompiledContract } from '../types/CompiledContract'
import { Views, Commands } from "../types/ExtensionTypes"
import { Parameter } from "../types/ABITypes"
import { outputChannel } from '../extension'
import { TransactionReceipt } from 'web3-core';

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

            for (let compiledFile of compiledFiles) {
                items.push(new SmartContractItem(compiledFile.name, vscode.TreeItemCollapsibleState.Collapsed, compiledFile))
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

function openFile(file: vscode.Uri): void {
    vscode.window.showTextDocument(file);
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

            const transactionHash: string = await deployContract(contract.contractData)
            let receipt = await getTransactionReceiptMined(transactionHash)
            contract.deployedAddress = receipt.contractAddress as string
            refreshContractsView(contract)
            progress.report({
                increment: 100
            })
            return transactionHash
        })
    } catch (e) {
        vscode.window.showInformationMessage(`Failed to deploy contract. ${e.message}!`)
    }
    vscode.window.showInformationMessage(`Contract successfully deployed!`)
})

vscode.commands.registerCommand(Commands.SendTransaction, async (contract: MethodItem) => {
    try {
        const transactionHash = await showSendTransactionInputBox(contract)
        if (transactionHash) {
            await showTransactionResultOutput(transactionHash)
        }
    } catch (e) {
        vscode.window.showInformationMessage(`${e.message}`)
    }
})

async function showSendTransactionInputBox(contract: MethodItem): Promise<string | undefined> {
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
        let transactionHash = await sendTransaction(contract.parent.parent.contractData, contract.parent.parent.deployedAddress, contract.label, inputArray)
        return transactionHash
    } catch (error) {
        vscode.window.showErrorMessage(error)
    }
}

async function showTransactionResultOutput(transactionHash: string) {
    outputChannel.show()
    outputChannel.appendLine(`Transaction sent: ${transactionHash}`)
    await getTransactionReceiptMined(transactionHash)
    outputChannel.appendLine(`... Transaction mined.`)
}