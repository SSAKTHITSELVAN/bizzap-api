// // src/core/interceptors/response.interceptor.ts
// import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
// import { Observable } from 'rxjs';
// import { map } from 'rxjs/operators';

// export interface Response<T> {
//   statusCode: number;
//   status: string;
//   message: string;
//   data: T;
//   errors: any;
// }

// @Injectable()
// export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
//   intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
//     const ctx = context.switchToHttp();
//     const response = ctx.getResponse();
    
//     return next.handle().pipe(
//       map(data => ({
//         statusCode: response.statusCode,
//         status: 'success',
//         message: data?.message || 'Operation successful',
//         data: data?.data || data,
//         errors: null,
//       })),
//     );
//   }
// }


// src/core/interceptors/response.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  statusCode: number;
  status: string;
  message: string;
  data: T;
  errors: any;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();
    const path = request.url;
    
    // CRITICAL: Skip wrapping for .well-known endpoints
    // Android/iOS deep linking verification requires raw JSON
    if (path.includes('/.well-known/')) {
      return next.handle(); // Return response as-is without wrapping
    }
    
    // Apply standard wrapper for all other endpoints
    return next.handle().pipe(
      map(data => ({
        statusCode: response.statusCode,
        status: 'success',
        message: data?.message || 'Operation successful',
        data: data?.data || data,
        errors: null,
      })),
    );
  }
}