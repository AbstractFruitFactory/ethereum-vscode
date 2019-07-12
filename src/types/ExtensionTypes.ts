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
    SendTransaction: `${Views.SmartContracts}.sendTransaction`
}