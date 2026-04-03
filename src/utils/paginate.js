// Parses page/limit from query, returns offset and meta object
function paginate(query) {
  const page  = Math.max(1, parseInt(query.page  || 1, 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || 20, 10)));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function paginationMeta(total, page, limit) {
  return {
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),
  };
}

module.exports = { paginate, paginationMeta };
