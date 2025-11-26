import { jsxRenderer } from "hono/jsx-renderer";
import { Link, Script } from "honox/server";

export default jsxRenderer(({ children }) => {
  return (
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="icon" href="/favicon.ico" />
        <Link href="/app/style.css" rel="stylesheet" />
        <Script src="/app/client.ts" async />
      </head>
      <body className="relative h-screen w-screen overflow-hidden bg-slate-900 text-white">
        <div class="absolute top-0 right-0 left-0 h-120 bg-linear-to-b from-teal-900/80 via-cyan-900/50 to-transparent opacity-60 blur-3xl"></div>
        <div class="-top-20 -left-20 absolute h-96 w-96 rounded-full bg-teal-600/20 blur-3xl"></div>
        <div class="-top-20 -right-20 absolute h-96 w-96 rounded-full bg-blue-900/30 blur-3xl"></div>
        <div class="absolute bottom-0 left-0 h-96 w-full bg-linear-to-t from-indigo-950/80 to-transparent"></div>
        <main className="absolute inset-0 z-10">{children}</main>
      </body>
    </html>
  );
});
