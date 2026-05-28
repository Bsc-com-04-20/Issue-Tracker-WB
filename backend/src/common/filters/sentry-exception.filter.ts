import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import * as Sentry from '@sentry/node';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (
      process.env.SENTRY_DSN &&
      httpStatus >= 500 &&
      httpStatus !== 503
    ) {
      Sentry.captureException(exception);
    }

    let body: Record<string, unknown> = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      body =
        typeof res === 'string'
          ? { statusCode: httpStatus, message: res }
          : { statusCode: httpStatus, ...(res as object) };
    }

    httpAdapter.reply(response, body, httpStatus);
  }
}
