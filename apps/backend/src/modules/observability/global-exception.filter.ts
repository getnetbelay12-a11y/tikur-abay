import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GlobalException');

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<any>();
    const request = context.getRequest<any>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException ? exception.getResponse() : null;
    const message = extractMessage(exceptionResponse, exception);
    const requestId = request?.headers?.['x-request-id'] || response?.getHeader?.('x-request-id') || 'unknown';

    this.logger.error(
      JSON.stringify({
        requestId,
        method: request?.method,
        path: request?.originalUrl,
        statusCode: status,
        message,
        ip: request?.ip,
        userAgent: request?.get?.('user-agent') || request?.headers?.['user-agent'] || 'unknown',
      }),
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      statusCode: status,
      message,
      requestId,
      timestamp: new Date().toISOString(),
      path: request?.originalUrl,
    });
  }
}

function extractMessage(exceptionResponse: unknown, exception: unknown) {
  if (typeof exceptionResponse === 'string') {
    return exceptionResponse;
  }

  if (exceptionResponse && typeof exceptionResponse === 'object') {
    const message = (exceptionResponse as { message?: string | string[] }).message;
    if (Array.isArray(message)) {
      return message.join(', ');
    }
    if (typeof message === 'string') {
      return message;
    }
  }

  if (exception instanceof Error) {
    return exception.message;
  }

  return 'Internal server error';
}
