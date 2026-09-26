import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
    // Allow all navigation cleanly without forcing redirect loops to /login
    return NextResponse.next({
        request,
    });
}
