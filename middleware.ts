import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Only handle /api routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Get backend URL from environment variables
  const backendUrl = process.env.INTERNAL_BACKEND_URL || 
                     process.env.NEXT_PUBLIC_BACKEND_URL || 
                     'http://localhost:8000';

  // Ensure destination is valid
  if (!/^https?:\/\//.test(backendUrl)) {
    console.error(`Invalid backend URL: "${backendUrl}"`);
    return NextResponse.json(
      { error: 'Invalid backend configuration' },
      { status: 500 }
    );
  }

  // Remove trailing slash if present
  const cleanBackendUrl = backendUrl.replace(/\/$/, '');

  // Get the path after /api
  const apiPath = request.nextUrl.pathname.replace(/^\/api/, '');
  
  // Construct the backend URL
  const backendApiUrl = `${cleanBackendUrl}/api${apiPath}${request.nextUrl.search}`;

  // Create headers for the backend request
  const headers = new Headers();
  
  // Copy all request headers except host
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'host') {
      headers.set(key, value);
    }
  });

  // Clone the request to read the body
  const clonedRequest = request.clone();
  
  // Get request body for methods that have one
  const hasBody = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
  
  // Proxy the request to the backend, preserving the HTTP method
  return (hasBody 
    ? clonedRequest.text().then(body => {
        return fetch(backendApiUrl, {
          method: request.method,
          headers: headers,
          body: body,
        });
      })
    : fetch(backendApiUrl, {
        method: request.method,
        headers: headers,
      })
  )
    .then(async (response) => {
      // Get response body
      const responseBody = await response.text();
      
      // Create response with same status and headers
      const nextResponse = new NextResponse(responseBody, {
        status: response.status,
        statusText: response.statusText,
      });

      // Copy response headers
      response.headers.forEach((value, key) => {
        // Skip headers that Next.js manages
        if (
          key.toLowerCase() !== 'content-encoding' &&
          key.toLowerCase() !== 'transfer-encoding' &&
          key.toLowerCase() !== 'content-length'
        ) {
          nextResponse.headers.set(key, value);
        }
      });

      return nextResponse;
    })
    .catch((error) => {
      console.error('Error proxying request to backend:', error);
      return NextResponse.json(
        { error: 'Failed to connect to backend' },
        { status: 502 }
      );
    });
}

// Configure which routes this middleware should run on
export const config = {
  matcher: '/api/:path*',
};

