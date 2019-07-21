import { CompiledContract } from "../types/CompiledContract"
import Web3 from "web3"
import { Event, Function, types } from "../types/ABITypes"
import { TransactionReceipt } from "web3-core";
const Web3Class = require('web3')
var path = require('path')
var fs = require('fs')
var solc = require('solc')
var Web3EthAbi = require('web3-eth-abi');

var web3: Web3
let contractData: CompiledContract[] = []
let accounts: string[]

export function compileSolidity(filePath: string): CompiledContract[] | undefined {
    const filecontent: string = fs.readFileSync(filePath, 'utf8')
    const fileName: string = path.basename(filePath)
    const input = generateSolidityCompilerInput(path.basename(filePath), filecontent)
    const output = JSON.parse(solc.compile(JSON.stringify(input)))

    if (output.errors) {
        throw new Error(JSON.stringify(output.errors))
    } else {
        const contracts = output.contracts[fileName]
        for (let contractName in contracts) {
            contractData.push({
                name: contractName,
                abi: contracts[contractName].abi,
                bytecode: contracts[contractName].evm.bytecode.object
            })
        }
        return contractData
    }
}

export async function deployContract(contract: CompiledContract): Promise<string> {
    if (!await isConnected()) {
        throw new Error('Not connected to blockchain.')
    }
    const contractInstance = new web3.eth.Contract(contract.abi)
    return new Promise((resolve, reject) => {
        contractInstance.deploy({ data: contract.bytecode, arguments: [] }).send({ from: accounts[0], gas: 1000000 })
            .on('error', (error: Error) => {
                reject(error)
            })
            .on('transactionHash', (transactionHash: string) => {
                resolve(transactionHash)
            })
    })
}

export async function connectToBlockchain(blockchain_address: string) {
    const options = {
        defaultBlock: 'latest',
        defaultGas: 1,
        defaultGasPrice: 0,
        transactionBlockTimeout: 50,
        transactionConfirmationBlocks: 24,
        transactionPollingTimeout: 480
    }
    web3 = new Web3Class(blockchain_address, null, options)
    accounts = await web3.eth.getAccounts()
    web3.defaultAccount = accounts[0]
}

export function getCompiledFiles(): CompiledContract[] {
    return contractData
}

export function getEventData(abi: any[]): Event[] {
    let events: Event[] = []
    return getAbiData<Event>(abi, events, types.event)
}

export function getFunctionData(abi: any[]): Function[] {
    let functions: Function[] = []
    return getAbiData<Function>(abi, functions, types.function)
}

export function getAbiData<T>(abi: any[], types: T[], type: string): T[] {
    for (let entity of abi) {
        if (entity.type === type) {
            types.push(entity)
        }
    }
    return types
}

export function decodeEvent(event: Event, data: string) {
    let eventTopic: string = web3.eth.abi.encodeEventSignature(event)
    return Web3EthAbi.decodeLog(event.inputs, data, [eventTopic])
}

export async function sendTransaction(abi: any[], bytecode: string, contractAddress: string, functionName: string, args: any[] = []): Promise<string> {
    var contract = new web3.eth.Contract(abi, contractAddress, {
        data: bytecode,
        from: accounts[0],
        gasPrice: '10',
        gas: 100000
    })

    return new Promise((resolve, reject) => {
        contract.methods[functionName](...args).send({ from: accounts[0] })
            .on('error', (error: Error) => {
                reject(error.message)
            })
            .on('transactionHash', (transactionHash: string) => {
                resolve(transactionHash)
            })
    })
}

export function waitForMined(transactionHash: string, interval: number = 300): Promise<TransactionReceipt> {
    const transactionReceiptAsync = function (resolve: any, reject: any) {
        web3.eth.getTransactionReceipt(transactionHash, (error: Error, receipt) => {
            if (error) {
                reject(error);
            } else if (receipt == null) {
                setTimeout(
                    () => transactionReceiptAsync(resolve, reject),
                    interval);
            } else {
                resolve(receipt);
            }
        })
    }
    return new Promise(transactionReceiptAsync);
}

export async function getTransactionReceipt(transactionHash: string): Promise<TransactionReceipt> {
    return await web3.eth.getTransactionReceipt(transactionHash)
}

export async function isConnected(): Promise<boolean> {
    try {
        await web3.eth.getAccounts()
    } catch (error) {
        return false
    }
    return true
}

export function encodeFunctionSignature(signature: string): string {
    return Web3EthAbi.encodeFunctionSignature(signature)
}

export function encodeEventSignature(signature: string): string {
    return Web3EthAbi.encodeEventSignature(signature)
}

export function encodeParameter(type: string, value: string) {
    let val
    try {
        val = JSON.parse(value)
    } catch (error) {
        try {
            return Web3EthAbi.encodeParameter(type, value)
        } catch (error) {
            throw error
        }
    }
    try {
        return Web3EthAbi.encodeParameter(type, val)
    } catch (error) {
        throw error
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