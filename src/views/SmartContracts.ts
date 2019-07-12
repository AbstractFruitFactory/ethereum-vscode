import * as vscode from 'vscode'
import { getCompiledFiles, deployContract, getFunctionData, sendTransaction } from "../utils/Web3Utils"
import { CompiledContract } from '../types/CompiledContract'
import { Views, Commands } from "../types/ExtensionTypes"

export class SmartContractsProvider implements vscode.TreeDataProvider<SmartContractItem | ContractDataItem> {
    public contractFiles: string[] = []

    private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>()
    readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event

    constructor() {
    }

    public refresh(): any {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: SmartContractItem): vscode.TreeItem {
        return element
    }

    public async getChildren(element?: SmartContractItem): Promise<SmartContractItem[] | ContractDataItem[]> {
        if (element) {
            return [
                new ContractDataItem('ABI', element.contractData.abi),
                new ContractDataItem('bytecode', element.contractData.bytecode)
            ]
        }

        let contractItems: SmartContractItem[] = []
        const compiledFiles = getCompiledFiles()

        for (let compiledFile of compiledFiles) {
            contractItems.push(new SmartContractItem(compiledFile.name, vscode.TreeItemCollapsibleState.Collapsed, compiledFile))
        }
        return contractItems
    }
}

export class SmartContractItem extends vscode.TreeItem {
    contextValue = 'contract'
    public deployedAddress: string = ""

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

export function refreshContractsView() {
    treeDataProvider.refresh()
}

let contractsTreeView: vscode.TreeView<SmartContractItem | ContractDataItem>

const treeDataProvider = new SmartContractsProvider();
contractsTreeView = vscode.window.createTreeView<SmartContractItem | ContractDataItem>(Views.SmartContracts, { treeDataProvider });

vscode.commands.registerCommand(Commands.Deploy, async (contract: SmartContractItem) => {
    try {
        await deployContract(contract.contractData)
    } catch (e) {
        vscode.window.showInformationMessage(`Failed to deploy contract. ${e.message}!`)
    }
    vscode.window.showInformationMessage(`Contracts successfully deployed!`)
})

vscode.commands.registerCommand(Commands.SendTransaction, async (contract: SmartContractItem) => {
    try {
        await showPickFunction(contract.contractData)
    } catch (e) {
        vscode.window.showInformationMessage(`${e.message}`)
    }
})

async function showPickFunction(contractData: CompiledContract) {
    const functions = getFunctionData(contractData.abi)
    const functionNames = []

    for(let func of functions) {
        functionNames.push(func.name)
    }

    const selectedFunc: string | undefined = await vscode.window.showQuickPick(functionNames, {
        placeHolder: 'Choose a function to call'
    })

    if(!selectedFunc) {
        return 
    }

    const contractAddress: string | undefined = await vscode.window.showInputBox({
        placeHolder: 'Enter contract address'
    })

    if(!contractAddress) {
        return
    }

    const params: string | undefined = await vscode.window.showInputBox({
        placeHolder: 'Enter input parameters'
    })


    await sendTransaction(contractData, contractAddress, selectedFunc)
}
