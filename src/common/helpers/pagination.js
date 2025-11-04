export function getPageLinks (request, page, pageSize) {
  const buildUrl = (p, ps = pageSize) => {
    const u = new URL(request.url.href, request.server.info.uri)
    u.searchParams.set('page', p)
    u.searchParams.set('pageSize', ps)
    return u.pathname + u.search
  }

  return {
    self: buildUrl(page),
    first: buildUrl(1),
    ...(page > 1 ? { prev: buildUrl(page - 1) } : {}),
    next: buildUrl(page + 1)
  }
}
