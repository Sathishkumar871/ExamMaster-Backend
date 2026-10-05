import {
  Request,
  Response,
  NextFunction,
} from "express";
import jwt from "jsonwebtoken";

interface ManagerRequest extends Request {
  staff?: {
    id?: string | number;
    email?: string;
    role?: string;
    [key: string]: unknown;
  };
}

const managerAuth = (
  req: ManagerRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader =
      req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message:
          "Manager login required",
      });
    }

    const parts =
      authHeader.split(" ");

    if (
      parts.length !== 2 ||
      parts[0] !== "Bearer" ||
      !parts[1]
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid authorization format",
      });
    }

    const token = parts[1];

    const secret =
      process.env.JWT_SECRET;

    if (!secret) {
      console.error(
        "JWT_SECRET is missing",
      );

      return res.status(500).json({
        success: false,
        message:
          "JWT_SECRET is not configured",
      });
    }

    const decoded =
      jwt.verify(
        token,
        secret,
      ) as {
        id?: string | number;
        email?: string;
        role?: string;
        [key: string]: unknown;
      };

    console.log(
      "MANAGER JWT:",
      {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      },
    );

    if (
      String(decoded.role)
        .toLowerCase() !==
      "manager"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only manager access allowed",
      });
    }

    req.staff = decoded;

    next();
  } catch (error: any) {
    console.error(
      "MANAGER AUTH ERROR:",
      error,
    );

    if (
      error?.name ===
      "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Manager token expired. Please login again.",
      });
    }

    return res.status(401).json({
      success: false,
      message:
        "Invalid manager token",
    });
  }
};

export default managerAuth;