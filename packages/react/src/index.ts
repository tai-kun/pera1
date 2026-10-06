export * from "@pera1/core/utils";

/**************************************************************************************************/

export type * from "./components/browser-router.jsx";
export { default as BrowserRouter } from "./components/browser-router.jsx";

export type * from "./components/outlet.jsx";
export { default as Outlet } from "./components/outlet.jsx";

export type * from "./components/router.jsx";
export { default as Router } from "./components/router.jsx";

/**************************************************************************************************/

export type * from "./contexts/route-context.js";
export { default as RouteContext } from "./contexts/route-context.js";

export type * from "./contexts/router-context.js";
export { default as RouterContext } from "./contexts/router-context.js";

/**************************************************************************************************/

export type * from "./hooks/use-action-data.js";
export { default as useActionData } from "./hooks/use-action-data.js";

export type * from "./hooks/use-form-action.js";
export { default as useFormAction } from "./hooks/use-form-action.js";

export type * from "./hooks/use-loader-data.js";
export { default as useLoaderData } from "./hooks/use-loader-data.js";

export type * from "./hooks/use-navigate.js";
export { default as useNavigate } from "./hooks/use-navigate.js";

export type * from "./hooks/use-params.js";
export { default as useParams } from "./hooks/use-params.js";

export type * from "./hooks/use-route-context.js";
export { default as useRouteContext } from "./hooks/use-route-context.js";

export type * from "./hooks/use-route-path.js";
export { default as useRoutePath } from "./hooks/use-route-path.js";

export type * from "./hooks/use-router-context.js";
export { default as useRouterContext } from "./hooks/use-router-context.js";

export type * from "./hooks/use-submit.js";
export { default as useSubmit } from "./hooks/use-submit.js";
