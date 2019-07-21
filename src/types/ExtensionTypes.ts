export const Views = {
    Tools: 'tools',
    SolidityFiles: 'solidity-files',
    SmartContracts: 'smart-contracts'
}

export const Commands = {
    InputRPCEndpoint: 'extension.InputRPCEndpoint',
    CompileAll: `${Views.SolidityFiles}.compileAll`,
    Deploy: `${Views.SmartContracts}.deploy`,
    DecodeLog: `${Views.Tools}.decodeLog`,
    SendTransaction: `${Views.SmartContracts}.sendTransaction`,
    GetTransactionReceipt: `${Views.Tools}.getTransactionReceipt`,
    CopyContractData: `${Views.SmartContracts}.copyContractData`,
    EncodeFunctionSignature: `${Views.Tools}.encodeFunctionSignature`,
    EncodeEventSignature: `${Views.Tools}.encodeEventSignature`,
    OpenSolidityFile: `${Views.SolidityFiles}.openSolidityFile`,
    Compile: `${Views.SolidityFiles}.compile`
}