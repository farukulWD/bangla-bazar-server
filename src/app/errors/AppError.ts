import { TErrorSourse } from "../interface/error.interface";

export default class AppError extends Error {
    public statusCode

    public errorSources?: TErrorSourse
    constructor(statusCode: number, message: string, stack = "", errorSources?: TErrorSourse) {
        super(message)
        this.statusCode = statusCode
        this.errorSources = errorSources
        if (stack) {
            this.stack = stack
        }
        else {
            Error.captureStackTrace(this, this.constructor)
        }
    }
}
