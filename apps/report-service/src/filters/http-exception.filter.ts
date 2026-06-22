import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { Request, Response } from 'express';
import { STATUS_CODES } from 'http';

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;

    const detail = this.extractDetail(exceptionResponse, exception);
    const title = this.extractTitle(status, exceptionResponse, detail);

    const body: ProblemDetails = {
      type: 'about:blank',
      title,
      status,
      detail,
      instance: request.url
    };

    response.status(status).json(body);
  }

  private extractDetail(
    response: string | object | undefined,
    exception: unknown
  ): string {
    if (typeof response === 'string') {
      return response;
    }

    if (response && typeof response === 'object') {
      const message = (response as { message?: unknown }).message;

      if (Array.isArray(message)) {
        return message.join('; ');
      }

      if (typeof message === 'string') {
        return message;
      }
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return 'An unexpected error occurred';
  }

  private extractTitle(
    status: number,
    response: string | object | undefined,
    detail: string
  ): string {
    if (response && typeof response === 'object') {
      const error = (response as { error?: unknown }).error;

      if (typeof error === 'string' && error.length > 0) {
        return error;
      }
    }

    return STATUS_CODES[status] ?? detail;
  }
}
