import { createRouter as createReactRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

export const createRouter = () =>
  createReactRouter({
    routeTree,
    context: {
      head: '',
    },
  });

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
