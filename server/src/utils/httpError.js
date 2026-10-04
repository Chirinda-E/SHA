export class HttpError extends Error {
  constructor(status, message, extras = {}) {
    super(message);
    this.status = status;
    this.extras = extras;
  }
}

export function badRequest(message, extras) {
  return new HttpError(400, message, extras);
}

export function unauthorized(message = 'Please log in.') {
  return new HttpError(401, message);
}

export function forbidden(message = 'You cannot do that.') {
  return new HttpError(403, message);
}

export function notFound(message = 'Not found.') {
  return new HttpError(404, message);
}

export function conflict(message) {
  return new HttpError(409, message);
}
