import { type FC, useRef } from "hono/jsx";

export const WidgetTokenViewer: FC<{
  token: string;
  expiresAt: number;
}> = ({ token, expiresAt }) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const expiresAtDate = new Date(expiresAt);
  return (
    <div className="container mx-auto flex h-screen flex-col items-center justify-center p-4">
      <div className="w-full rounded-md border border-white/5 bg-slate-800/40 backdrop-blur-md">
        <textarea
          ref={ref}
          className="w-full resize-none bg-transparent p-2"
          name="token"
          readOnly
          rows={8}
          onFocus={() => {
            ref.current?.select();
          }}
        >
          {token}
        </textarea>
      </div>
      <div className="mt-2 text-sm text-white/50">复制上方内容到 Forward 的模块管理中配置</div>
      <div className="mt-2 text-sm text-white/50">令牌将在 {expiresAtDate.toLocaleString()} 过期</div>
    </div>
  );
};
