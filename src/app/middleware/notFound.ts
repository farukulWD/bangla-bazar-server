
import { NextFunction, Request, Response } from 'express'
import httpStatus from 'http-status'
import { TGenericErrorResponse } from '../interface/error.interface'

const notFound = (req: Request, res: Response, _next: NextFunction) => {

  const errorResponse: TGenericErrorResponse = {
    success: false,
    message: 'API not found',
    errorSources: [{
      path: 'api',
      message: 'API not found',
    }],
    statusCode: httpStatus.NOT_FOUND
  }

  return res.status(httpStatus.NOT_FOUND).json(
    errorResponse
  )
}

export default notFound
