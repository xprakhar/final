import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { RouterContext } from '../router-context';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';

const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <div>
      <div className='flex min-h-screen flex-col items-center justify-center'>
        <Outlet />
      </div>
      <TanStackRouterDevtools position='bottom-right' />
    </div>
  );
}

export { Route };
