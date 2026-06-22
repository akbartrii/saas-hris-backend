export interface UserPayload {
  id: string;
  email: string;
  role: string;
  userId: string;
  employeeId: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp?: string;
    path?: string;
  };
}
