import {
  Request,
  Response,
  NextFunction,
} from "express";

import jwt from "jsonwebtoken";

interface VolunteerRequest
  extends Request {
  volunteer?: {
    id: string;
    role: "volunteer";
    mobile?: string;
    sessionId?: string;
  };
}

const volunteerAuth = (
  req: VolunteerRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authorization =
      req.headers.authorization;

    const token =
      authorization?.startsWith(
        "Bearer ",
      )
        ? authorization
            .substring(7)
            .trim()
        : authorization
            ?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          "Volunteer login required.",
      });
    }

    const secret =
      process.env.JWT_SECRET;

    if (!secret) {
      return res.status(500).json({
        success: false,
        message:
          "JWT_SECRET is not configured.",
      });
    }

    const decoded: any =
      jwt.verify(
        token,
        secret,
      );

    if (
      decoded?.role !==
      "volunteer"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Volunteer access denied.",
      });
    }

    const volunteerId =
      decoded?.volunteerId ||
      decoded?.id;

    if (!volunteerId) {
      return res.status(401).json({
        success: false,
        message:
          "Volunteer ID not found in token.",
      });
    }

    req.volunteer = {
      id: String(
        volunteerId,
      ),

      role: "volunteer",

      mobile:
        decoded?.mobile
          ? String(
              decoded.mobile,
            )
          : undefined,

      sessionId:
        decoded?.sessionId
          ? String(
              decoded.sessionId,
            )
          : undefined,
    };

    next();
  } catch (error) {
    console.error(
      "[VOLUNTEER AUTH ERROR]",
      error,
    );

    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired volunteer token.",
    });
  }
};

export default volunteerAuth;