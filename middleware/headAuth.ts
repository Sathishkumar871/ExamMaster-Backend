import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface HeadRequest extends Request {
  head?: any;
}

const headAuth = (
  req: HeadRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Head/CEO login required"
      });
    }

    const decoded: any = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    );

    // ఇక్కడ రోల్ "head" లేదా టీచర్ టైప్ "CEO" అయి ఉండాలి
    if (decoded.role !== "head" && decoded.teacherType !== "CEO") {
      return res.status(403).json({
        success: false,
        message: "Only Head or CEO access allowed"
      });
    }

    req.head = decoded;
    next();

  } catch (error: any) {
    return res.status(401).json({
      success: false,
      message: "Invalid head token"
    });
  }
};

export default headAuth;