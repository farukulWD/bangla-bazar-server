
export type TErrorSourse = {
    path: string | number,
    message: string
}[]


export type TGenericErrorResponse = {
    statusCode: number,
    success: boolean,
    message: string,
    errorSources: TErrorSourse,
    stack?: string | null
}
