// an error that carries the HTTP status and a message that is safe to show the customer.
// "code" is optional and lets the website react to a specific case (for example "suspended").
class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

module.exports = { HttpError };
