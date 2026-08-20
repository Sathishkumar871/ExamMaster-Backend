import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";


interface AuthRequest extends Request {
  user?: any;
}
const auth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token =
      req.headers.authorization?.split(" ")[1];
    if(!token){
      return res.status(401).json({
        success:false,
        message:"Login required"
      });
    }
    const decoded:any =
      jwt.verify(
        token,
        process.env.JWT_SECRET as string
      );
    // Student only access
    if(decoded.role !== "student"){

      return res.status(403).json({

        success:false,

        message:"Student access only"

      });

    }
    req.user = decoded;
    next();


  } catch(error){


    return res.status(401).json({

      success:false,

      message:"Invalid or expired token"

    });


  }


};



export default auth;