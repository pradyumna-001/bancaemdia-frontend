// Fault injection belongs exclusively to the separate fixture build, never dist/.
import { useLoaderData, type RouteObject } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ApiError } from '../../../src/api/error';

function FixturePage({ children }: { children: ReactNode }) {
  const data: unknown = useLoaderData();
  if (
    typeof data === 'object' &&
    data !== null &&
    'fixtureRenderFailure' in data &&
    data.fixtureRenderFailure
  )
    throw new Error('DETALHE_INTERNO_DE_RENDERIZACAO');
  return children;
}

function withFailure(route: RouteObject): RouteObject {
  const original = route.loader;
  return {
    ...route,
    element: <FixturePage>{route.element}</FixturePage>,
    loader: async (args) => {
      const page = new URL(args.request.url).pathname;
      const response = await fetch(
        `/testes/rota?${new URLSearchParams({ pagina: page })}`,
        { signal: args.request.signal },
      );
      if (!response.ok) {
        if (
          [429, 503].includes(response.status) ||
          response.headers.has('X-Test-Outcome-Unknown')
        )
          throw new ApiError('http', {
            status: response.status,
            headers: response.headers,
            mutation: response.headers.has('X-Test-Outcome-Unknown'),
          });
        throw response;
      }
      const data: unknown =
        typeof original === 'function' ? await original(args) : undefined;
      return {
        ...(typeof data === 'object' && data !== null ? data : {}),
        fixtureRenderFailure: response.headers.has('X-Test-Render-Failure'),
      };
    },
  };
}

export function routeFailures(routes: RouteObject[]): RouteObject[] {
  return routes.map((route) => {
    if (route.path === '*') return route;
    if (route.children)
      return { ...route, children: route.children.map(withFailure) };
    return withFailure(route);
  });
}
