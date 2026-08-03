/**
 * Register project-specific GET APIs here.
 *
 * These handlers are registered before JSON Server's standard router, so a
 * custom route can reproduce the target API's parameter names, validation and
 * response shape while the regular /products, /orders, ... routes remain
 * available.
 */
function registerCustomGetRoutes(server, { db }) {
  // Example:
  // GET /api/products/search?q=note&minPrice=100&page=1&pageSize=20
  server.get('/api/products/search', (req, res) => {
    const validationError = validateSearchQuery(req.query);
    if (validationError) {
      return res.status(400).jsonp({
        code: 'INVALID_PARAMETER',
        message: validationError,
      });
    }

    const keyword = String(req.query.q ?? '').trim().toLocaleLowerCase();
    const minPrice = toOptionalNumber(req.query.minPrice);
    const maxPrice = toOptionalNumber(req.query.maxPrice);
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);

    const matched = db.get('products').value()
      .filter((product) => !keyword
        || product.name.toLocaleLowerCase().includes(keyword))
      .filter((product) => minPrice === null || product.price >= minPrice)
      .filter((product) => maxPrice === null || product.price <= maxPrice)
      .sort((left, right) => left.id - right.id);

    const offset = (page - 1) * pageSize;
    return res.jsonp({
      items: matched.slice(offset, offset + pageSize),
      pagination: {
        page,
        pageSize,
        totalItems: matched.length,
        totalPages: Math.ceil(matched.length / pageSize),
      },
    });
  });

  // Example of calculated behavior that the default JSON Server route does not
  // provide:
  // GET /api/products/1/availability?quantity=3
  server.get('/api/products/:id/availability', (req, res) => {
    const quantity = Number(req.query.quantity ?? 1);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).jsonp({
        code: 'INVALID_PARAMETER',
        message: 'quantity must be a positive integer',
      });
    }

    const productId = Number(req.params.id);
    const product = db.get('products').find({ id: productId }).value();
    if (!product) {
      return res.status(404).jsonp({
        code: 'NOT_FOUND',
        message: `Product ${req.params.id} was not found`,
      });
    }

    return res.jsonp({
      productId: product.id,
      requestedQuantity: quantity,
      available: product.stock >= quantity,
      remainingStock: Math.max(product.stock - quantity, 0),
    });
  });
}

function validateSearchQuery(query) {
  for (const name of ['minPrice', 'maxPrice']) {
    if (query[name] !== undefined) {
      const value = Number(query[name]);
      if (!Number.isFinite(value) || value < 0) {
        return `${name} must be a non-negative number`;
      }
    }
  }

  for (const name of ['page', 'pageSize']) {
    if (query[name] !== undefined) {
      const value = Number(query[name]);
      if (!Number.isInteger(value) || value < 1) {
        return `${name} must be a positive integer`;
      }
    }
  }

  if (query.pageSize !== undefined && Number(query.pageSize) > 100) {
    return 'pageSize must be 100 or less';
  }

  if (
    query.minPrice !== undefined
    && query.maxPrice !== undefined
    && Number(query.minPrice) > Number(query.maxPrice)
  ) {
    return 'minPrice must be less than or equal to maxPrice';
  }

  return null;
}

function toOptionalNumber(value) {
  return value === undefined ? null : Number(value);
}

module.exports = { registerCustomGetRoutes };
