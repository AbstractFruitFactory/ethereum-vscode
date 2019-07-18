export interface Event {
    anonymous: boolean,
    inputs: EventParameter[],
    name: string,
    type: 'event'
}

export interface Function {
    constant: boolean,
    inputs: Parameter[],
    name: string,
    outputs: Parameter[],
    payable: boolean,
    stateMutability: stateMutabilities,
    type: 'function'
}

export enum types {
    function = 'function',
    event = 'event'
}

export interface Parameter {
    name: string,
    type: string
}

interface EventParameter extends Parameter {
    indexed: boolean
}

enum stateMutabilities {
    view = 'view',
    pure = 'pure',
    nonpayable = 'nonpayable',
    payable = 'payable'
}