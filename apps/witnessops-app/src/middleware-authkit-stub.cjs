const { NextResponse } = require("next/server");

function authkitMiddleware() {
  return function authkit(request) {
    const requestHeaders = new Headers(request.headers);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("x-test-authkit", "1");
    return response;
  };
}

module.exports = { authkitMiddleware };
