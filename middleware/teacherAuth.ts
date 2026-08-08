import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";


interface TeacherRequest extends Request {

  teacher?: any;

}



const teacherAuth = (

  req: TeacherRequest,

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



    // Only teacher role allowed

    if(decoded.role !== "teacher"){


      return res.status(403).json({

        success:false,

        message:"Teacher access only"

      });


    }



    req.teacher = decoded;



    next();



  }

  catch(error:any){


    return res.status(401).json({

      success:false,

      message:"Invalid token"

    });


  }


};



export default teacherAuth;