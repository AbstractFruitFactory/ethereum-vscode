import { CompiledContract } from "../types/CompiledContract"
import Web3 from "web3"
import { Event, Function, types } from "../types/ABITypes"
import * as utils from 'web3-utils'

const Web3Class = require('web3')
var path = require('path')
var fs = require('fs')
var solc = require('solc')

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
    const contractInstance = new web3.eth.Contract(contract.abi)
    contractInstance.deploy({ data: contract.bytecode, arguments: [] }).send({ from: accounts[0], gas: 1000000 })
        .on('receipt', receipt => {
            return receipt.contractAddress
        })
}

export async function connectToBlockchain(blockchain_address: string) {
    web3 = new Web3Class(blockchain_address)
    accounts = await web3.eth.getAccounts()
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
    return web3.eth.abi.decodeLog(event.inputs, data, [eventTopic])
}

export async function sendTransaction(contractData: CompiledContract, contractAddress: string, functionName: string, args?: any[]) {
    var contract = new web3.eth.Contract(contractData.abi, contractAddress, {
        data: contractData.bytecode,
        from: accounts[0],
        gasPrice: '10',
        gas: 100000
    })
    await contract.methods[functionName]().send({ from: accounts[0] })
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