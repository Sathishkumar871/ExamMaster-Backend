import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";


interface ManagerRequest extends Request {

  staff?: any;

}



const managerAuth = (

  req: ManagerRequest,

  res: Response,

  next: NextFunction

) => {


  try {


    const token =
      req.headers.authorization?.split(" ")[1];



    if(!token){

      return res.status(401).json({

        success:false,

        message:"Manager login required"

      });

    }



    const decoded:any = jwt.verify(

      token,

      process.env.JWT_SECRET as string

    );



    // Only Manager Access

    if(decoded.role !== "manager"){


      return res.status(403).json({

        success:false,

        message:"Only manager access allowed"

      });


    }



    req.staff = decoded;


    next();



  }

  catch(error:any){


    return res.status(401).json({

      success:false,

      message:"Invalid manager token"

    });


  }


};



export default managerAuth;