export default class CLIError extends Error {
    suggestions?: string[];
    constructor(message: any, suggestions?: string[]);
}
