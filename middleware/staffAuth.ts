import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";


interface StaffRequest extends Request {

  staff?: any;

}



const staffAuth = (

  req: StaffRequest,

  res: Response,

  next: NextFunction

) => {


try{


const token =
req.headers.authorization?.split(" ")[1];



if(!token){

return res.status(401).json({

success:false,

message:"Staff login required"

});

}





const decoded:any = jwt.verify(

token,

process.env.JWT_SECRET as string

);





const allowedRoles = [

"mentor",

"manager",

"head"

];





if(!allowedRoles.includes(decoded.role)){


return res.status(403).json({

success:false,

message:"Staff access denied"

});



}





// JWT data attach

req.staff = {

id:decoded.id,

teacherId:decoded.teacherId,

name:decoded.name,

email:decoded.email,

mobile:decoded.mobile,

role:decoded.role,

department:decoded.department,

classId:decoded.classId,

className:decoded.className,

section:decoded.section

};





next();



}

catch(error:any){


return res.status(401).json({

success:false,

message:"Invalid staff token"

});


}



};



export default staffAuth;