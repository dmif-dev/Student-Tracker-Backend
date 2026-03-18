// // backend/src/types/index.ts
// import { Request } from 'express';

// export interface AuthRequest extends Request {
//   user?: {
//     id: string;
//     email: string;
//     role: string;
//     student?: any;
//     mentor?: any;
//     adminProfile?: any;
//   };
// }

// export interface PaginationQuery {
//   page?: number;
//   limit?: number;
//   sortBy?: string;
//   sortOrder?: 'asc' | 'desc';
// }

// export interface DateRangeQuery {
//   startDate?: string;
//   endDate?: string;
// }

// export interface ApiResponse<T = any> {
//   success: boolean;
//   data?: T;
//   message?: string;
//   errors?: any[];
//   meta?: {
//     page?: number;
//     limit?: number;
//     total?: number;
//     totalPages?: number;
//   };
// }