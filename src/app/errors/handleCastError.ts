import mongoose from "mongoose";
import { TErrorSourse, TGenericErrorResponse } from "../interface/error.interface";
import config from "../config";

export const handleCastError = (err: mongoose.Error.CastError): TGenericErrorResponse => {

    const errorSources: TErrorSourse = [
        {
            path: err.path,
            message: err.message
        }
    ]

    return {
        success: false,
        statusCode: 400,
        message: 'Invalid id',
        errorSources,
        stack: config.node_environment === 'development' ? err?.stack : null
    }
}
