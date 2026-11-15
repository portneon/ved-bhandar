export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }

  static unauthorized(message = "Not authenticated"): HttpError {
    return new HttpError(401, message);
  }

  static forbidden(message = "Not allowed"): HttpError {
    return new HttpError(403, message);
  }

  static notFound(message = "Not found"): HttpError {
    return new HttpError(404, message);
  }

  static conflict(message: string): HttpError {
    return new HttpError(409, message);
  }
}
