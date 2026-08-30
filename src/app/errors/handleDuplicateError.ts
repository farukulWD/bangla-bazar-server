import { TErrorSourse, TGenericErrorResponse } from "../interface/error.interface";
import config from "../config";

type TMongoDuplicateError = {
    keyPattern?: Record<string, unknown>
    keyValue?: Record<string, unknown>
    stack?: string
}

const handleDuplicateError = (err: TMongoDuplicateError): TGenericErrorResponse => {

    const errorSources: TErrorSourse = [
        {
            path: err && err?.keyPattern && Object.keys(err?.keyPattern)[0] || "",
            message: `${err && err?.keyValue && Object.values(err?.keyValue)[0]} already exists`
        }
    ]

    return {
        success: false,
        statusCode: 400,
        message: 'Duplicate id error',
        errorSources,
        stack: config.node_environment === 'development' ? err?.stack : null
    }
}

export default handleDuplicateError
