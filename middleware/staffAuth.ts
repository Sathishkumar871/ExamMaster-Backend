
import {
  Request,
  Response,
  NextFunction,
} from "express";

import jwt from "jsonwebtoken";

interface StaffRequest
  extends Request {
  staff?: {
    id?: string;
    teacherId?: string;
    name?: string;
    email?: string;
    mobile?: string;
    role?: string;
    department?: string;
    classId?: string;
    className?: string;
    section?: string;
  };
}

const staffAuth = (
  req: StaffRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    /* =====================================================
       TOKEN
    ===================================================== */

    const authorization =
      req.headers.authorization;

    const token =
      authorization?.startsWith(
        "Bearer ",
      )
        ? authorization.substring(7).trim()
        : authorization
            ?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          "Staff login required",
      });
    }

    /* =====================================================
       VERIFY TOKEN
    ===================================================== */

    const decoded: any =
      jwt.verify(
        token,
        process.env.JWT_SECRET as string,
      );

    /* =====================================================
       ROLE
    ===================================================== */

    const role = String(
      decoded?.role ?? "",
    )
      .trim()
      .toLowerCase();

    console.log(
      "[STAFF AUTH] decoded role:",
      role,
    );

    /* =====================================================
       ALLOWED STAFF ROLES
       
       Your existing roles:
       mentor
       manager
       head

       Added:
       staff
       director
       ===================================================== */

    const allowedRoles = [
      "staff",
      "mentor",
      "manager",
      "head",
      "director",
    ];

    if (
      !allowedRoles.includes(
        role,
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Staff access denied",
        role,
      });
    }

    /* =====================================================
       STAFF ID
    ===================================================== */

    const staffId =
      decoded?.id ||
      decoded?.userId ||
      decoded?.staffId ||
      decoded?.teacherId;

    if (!staffId) {
      return res.status(401).json({
        success: false,
        message:
          "Staff ID not found in token",
      });
    }

    /* =====================================================
       ATTACH STAFF
    ===================================================== */

    req.staff = {
      id: String(staffId),

      teacherId:
        decoded?.teacherId
          ? String(
              decoded.teacherId,
            )
          : undefined,

      name:
        decoded?.name
          ? String(
              decoded.name,
            )
          : undefined,

      email:
        decoded?.email
          ? String(
              decoded.email,
            )
          : undefined,

      mobile:
        decoded?.mobile
          ? String(
              decoded.mobile,
            )
          : undefined,

      role,

      department:
        decoded?.department
          ? String(
              decoded.department,
            )
          : undefined,

      classId:
        decoded?.classId
          ? String(
              decoded.classId,
            )
          : undefined,

      className:
        decoded?.className
          ? String(
              decoded.className,
            )
          : undefined,

      section:
        decoded?.section
          ? String(
              decoded.section,
            )
          : undefined,
    };

    next();
  } catch (error) {
    console.error(
      "[STAFF AUTH ERROR]",
      error,
    );

    return res.status(401).json({
      success: false,
      message:
        "Invalid staff token",
    });
  }
};

export default staffAuth;

