import { CompiledContract } from "../types/CompiledContract"
import { ContractItem } from '../views/ContractExplorer'
import Web3 from "web3"
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
                filePath: filePath,
                abi: contracts[contractName].abi,
                bytecode: contracts[contractName].evm.bytecode.object
            })
        }
        return contractData
    }
}

export async function deployContract(contract: ContractItem) {
    const compiledContracts: CompiledContract[] | undefined = compileSolidity(contract.path)
    if (compiledContracts) {
        for (let contract of compiledContracts) {
            const contractInstance = new web3.eth.Contract(contract.abi)
            await contractInstance.deploy({ data: contract.bytecode, arguments: [] }).send({ from: accounts[0] })
        }
    }
}

export async function connectToBlockchain(blockchain_address: string) {
    web3 = new Web3Class(blockchain_address)
    accounts = await web3.eth.getAccounts()
}

export function getCompiledFiles(): CompiledContract[] {
    return contractData
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