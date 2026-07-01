import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

export interface Response<T> {
  success: boolean;
  data: T;
  message: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((response) => {
        // If response is already formatted, return as is
        if (response && typeof response === "object" && "success" in response) {
          if (response.data !== undefined) {
            response.data = this.sanitizeEncryptedData(response.data);
          }
          return response;
        }

        // Extract pagination meta if exists
        const meta = response?.meta || undefined;
        let data = response?.data !== undefined ? response.data : response;
        const message = response?.message || "Operation successful";

        // Sanitize encrypted salaries recursively
        data = this.sanitizeEncryptedData(data);

        return {
          success: true,
          data,
          message,
          ...(meta && { meta }),
        };
      }),
    );
  }

  private sanitizeEncryptedData(obj: any, visited = new WeakSet()): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Convert Prisma Decimal objects to standard JavaScript numbers
    if (
      obj.constructor?.name === "Decimal" ||
      (typeof obj === "object" &&
        typeof obj.s === "number" &&
        typeof obj.e === "number" &&
        Array.isArray(obj.d))
    ) {
      if (typeof obj.toNumber === "function") {
        return obj.toNumber();
      }
      try {
        if (obj.d.length === 1) {
          return obj.s * obj.d[0];
        }
        const str = obj.d
          .map((val: any, idx: number) => {
            if (idx === 0) return val.toString();
            return val.toString().padStart(7, "0");
          })
          .join("");
        const numStr =
          obj.s * Number(str) * Math.pow(10, obj.e - (str.length - 1));
        return Number(numStr.toFixed(2));
      } catch {
        return obj;
      }
    }

    // Preserve Date objects as-is (Prisma DateTime fields)
    if (obj instanceof Date) {
      return obj;
    }

    if (typeof obj !== "object") {
      return obj;
    }

    if (visited.has(obj)) {
      return obj;
    }
    visited.add(obj);

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeEncryptedData(item, visited));
    }

    const sensitiveKeys = [
      "base_salary",
      "fixed_allowance",
      "phone_allowance",
      "dinas_allowance",
    ];

    const copy = { ...obj };

    sensitiveKeys.forEach((key) => {
      if (key in copy) {
        const val = copy[key];
        // If it's an encrypted string format (starts with hex, has a colon, etc.)
        if (typeof val === "string" && val.includes(":")) {
          copy[key] = null;
        }
      }
    });

    for (const key in copy) {
      if (Object.prototype.hasOwnProperty.call(copy, key)) {
        copy[key] = this.sanitizeEncryptedData(copy[key], visited);
      }
    }

    return copy;
  }
}
