import { NextResponse } from "next/server";
import { auth, BASE_PATH } from "@/auth";

// api, _next/static, _next/image, favicon.ico以外のアクセスであればmiddlewareを通すという意味です。
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

export default auth((req) => {
  // ユーザーが認証済みか判断し、認証済みでなければサインインページにリダイレクトします。
  const reqUrl = new URL(req.url);
  if (!req.auth && reqUrl?.pathname !== "/") {
    return NextResponse.redirect(
      new URL(
        `${BASE_PATH}/signin?callbackUrl=${encodeURIComponent(
          reqUrl?.pathname
        )}`,
        req.url
      )
    );
  }
});