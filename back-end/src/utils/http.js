// Shared HTTP plumbing: typed errors, async route wrapping, and translation
// of PostgreSQL constraint violations into the API's error envelope
// ({ statusCode, message, error }) that the frontend already understands.

class HttpError extends Error {
  constructor(statusCode, message, errorName) {
    super(message);
    this.statusCode = statusCode;
    this.error = errorName
      || (statusCode === 400 ? 'Bad Request'
        : statusCode === 401 ? 'Unauthorized'
          : statusCode === 403 ? 'Forbidden'
            : statusCode === 404 ? 'Not Found'
              : statusCode === 409 ? 'Conflict'
                : 'Error');
  }
}

function notFound(label, id) {
  return new HttpError(404, `${label} ${id} not found`);
}

function badRequest(message) {
  return new HttpError(400, message);
}

function conflict(message) {
  return new HttpError(409, message);
}

/**
 * Wrap an async route handler so rejections reach the central errorHandler.
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/** Translate known PostgreSQL error codes into API-friendly errors. */
function mapPgError(err) {
  if (err && typeof err.code === 'string' && /^23/.test(err.code)) {
    switch (err.code) {
      case '23505': // unique_violation
      case '23P01': { // exclusion_violation
        const detail = err.detail || '';
        if (/username/i.test(detail)) return conflict('Username is already taken');
        if (/barcode/i.test(detail)) return conflict('Product with this barcode already exists');
        if (/customers_company_phone/i.test(detail)) {
          return conflict('A customer with this phone number already exists');
        }
        if (/inventory_product_company/i.test(detail)) {
          return conflict('Inventory already exists for this product');
        }
        if (/bills_order_id/i.test(detail)) return conflict('Bill already exists for this order');
        if (/payments_bill_no/i.test(detail)) return conflict('Payment already recorded for this bill');
        if (/(orders|deliveries|returns)_company_id.*companies/.test(detail)) {
          return badRequest('Unknown company');
        }
        return conflict('Record violates a uniqueness constraint');
      }
      case '23503': // foreign_key_violation
        if (/(order_items|bills)_order_id/.test(err.detail || '')) {
          return conflict('Referenced by billing or order history; cannot delete');
        }
        return badRequest('Referenced record does not exist');
      case '23514': // check_violation
        return badRequest(`Invalid value for ${err.column || err.constraint}: ${err.detail || 'constraint violated'}`);
      default:
        return null;
    }
  }
  return null;
}

module.exports = {
  HttpError,
  notFound,
  badRequest,
  conflict,
  asyncHandler,
  mapPgError,
};
