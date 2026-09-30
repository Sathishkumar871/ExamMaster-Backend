import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export interface JanasevaAuthPayload extends JwtPayload {
  userId: string;
  mobile: string;
  role: string;
  type: "janaseva";
}

export interface JanasevaRequest extends Request {
  janasevaUser?: JanasevaAuthPayload;
}

export const janasevaAuth = (
  req: JanasevaRequest,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;

    // --------------------------------
    // 1. Authorization header check
    // --------------------------------
    if (!authHeader) {
      res.status(401).json({
        success: false,
        message: "Authorization token is required.",
      });
      return;
    }

    // Expected:
    // Authorization: Bearer <token>

    if (!authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Invalid authorization format.",
      });
      return;
    }

    // --------------------------------
    // 2. Extract token
    // --------------------------------
    const token = authHeader.substring(7).trim();

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Authentication token is missing.",
      });
      return;
    }

    // --------------------------------
    // 3. JWT secret
    // --------------------------------
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error("❌ JWT_SECRET is missing.");

      res.status(500).json({
        success: false,
        message: "Authentication configuration is missing.",
      });
      return;
    }

    // --------------------------------
    // 4. Verify JWT
    // --------------------------------
    const decoded = jwt.verify(
      token,
      jwtSecret,
    ) as JanasevaAuthPayload;

    // --------------------------------
    // 5. Validate token type
    // --------------------------------
    if (decoded.type !== "janaseva") {
      res.status(401).json({
        success: false,
        message: "Invalid Janaseva authentication token.",
      });
      return;
    }

    // --------------------------------
    // 6. Validate user ID
    // --------------------------------
    if (!decoded.userId) {
      res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
      return;
    }

    // --------------------------------
    // 7. Attach user to request
    // --------------------------------
    req.janasevaUser = decoded;

    // --------------------------------
    // 8. Continue to controller
    // --------------------------------
    next();
  } catch (error: any) {
    console.error("❌ Janaseva auth middleware error:", error);

    if (error?.name === "TokenExpiredError") {
      res.status(401).json({
        success: false,
        message: "Your session has expired. Please login again.",
      });
      return;
    }

    if (error?.name === "JsonWebTokenError") {
      res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
      return;
    }

    res.status(401).json({
      success: false,
      message: "Authentication failed.",
    });
  }
};