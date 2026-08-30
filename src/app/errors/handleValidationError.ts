import mongoose from "mongoose"
import { TErrorSourse, TGenericErrorResponse } from "../interface/error.interface"
import config from "../config";

export const handleValidationError = (err: mongoose.Error.ValidationError): TGenericErrorResponse => {

    const errorSources: TErrorSourse = []

    Array(err.errors).map(er => {
        Object.keys(er).map(singleError => {
            errorSources.push({
                path: singleError,
                message: er[singleError]?.message
            })
        })
    })

    return {
        success: false,
        statusCode: 400,
        message: "Data validation error",
        errorSources,
        stack: config.node_environment === "development" ? err?.stack : null,
    };
}
