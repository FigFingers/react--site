import type { NextRequest } from "next/server";
import { toErrorPayload } from "@/server/http/errors";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

export type HttpMethod = (typeof METHODS)[number];

export interface RouteContext<
  Params extends Record<string, string | string[]> = Record<
    string,
    string | string[]
  >,
> {
  params: Params;
}

export type ApiHandler<
  Params extends Record<string, string | string[]> = Record<
    string,
    string | string[]
  >,
> = (
  req: NextRequest,
  context: RouteContext<Params>,
) => Promise<Response> | Response;

export type HandlerMap<Params extends Record<string, string | string[]>> =
  Partial<Record<HttpMethod, ApiHandler<Params>>>;

export function createApiHandler<
  Params extends Record<string, string | string[]>,
>(handlers: HandlerMap<Params>): ApiHandler<Params> {
  const allowHeader = Object.entries(handlers)
    .filter(([, fn]) => typeof fn === "function")
    .map(([method]) => method)
    .join(", ");

  return async function handler(req, context) {
    const method = req.method.toUpperCase() as HttpMethod;
    const fn = handlers[method];
    if (!fn) {
      return new Response(null, {
        status: 405,
        headers: allowHeader ? { Allow: allowHeader } : undefined,
      });
    }

    try {
      return await fn(req, context);
    } catch (error) {
      const { status, body } = toErrorPayload(error);
      return Response.json(body, { status });
    }
  };
}

export function createRouteHandlers<
  Params extends Record<string, string | string[]>,
  H extends HandlerMap<Params>,
>(handlers: H): { [K in keyof H]: ApiHandler<Params> } {
  const apiHandler = createApiHandler<Params>(handlers);

  // ここで「返すオブジェクトは H のキーだけを持つ」と宣言
  const exports: { [K in keyof H]: ApiHandler<Params> } = {} as {
    [K in keyof H]: ApiHandler<Params>;
  };

  // handlers に実際に定義されているキーだけを回す
  for (const method of Object.keys(handlers) as (keyof H)[]) {
    const fn = handlers[method];
    if (typeof fn === "function") {
      // method は keyof H なので、そのまま exports に代入できる
      exports[method] = apiHandler;
    }
  }

  return exports;
}
