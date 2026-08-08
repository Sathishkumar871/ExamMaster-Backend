import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import Staff from "../models/Staff";



// ======================================
// STAFF LOGIN
// Head -> Teacher ID + Access Code
// Mentor/Manager -> Teacher ID + Mobile
// ======================================

export const staffLogin = async (

req:Request,

res:Response

)=>{


try{


const {

teacherId,

mobile,
email,
accessCode

}=req.body;



let staff:any;




// ===============================
// HEAD LOGIN
// ===============================

if(accessCode){


staff = await Staff.findOne({

teacherId,

accessCode

});


}





// ===============================
// MENTOR / MANAGER LOGIN
// ===============================

else{


staff = await Staff.findOne({
email,

mobile

});


}






if(!staff){


return res.status(404).json({

success:false,

message:"Invalid Login Details"

});


}






if(!staff.isApproved){


return res.status(403).json({

success:false,

message:"Waiting for Head Approval"

});


}






const token = jwt.sign(

{
  id: staff._id,

  teacherId: staff.teacherId,

  name: staff.name,

  role: staff.role,

  department: staff.department,

  classId: staff.classId,

  className: staff.className,

  section: staff.section

},

process.env.JWT_SECRET as string,

{
  expiresIn:"7d"
}

);










let redirect="";



if(staff.role==="mentor"){


redirect="/mentor/dashboard";


}


else if(staff.role==="manager"){


redirect="/manager/dashboard";


}


else if(staff.role==="head"){


redirect="/head/dashboard";


}








return res.json({

success:true,

message:"Login Success",

token,

redirect,


staff:{


id:staff._id,

teacherId:staff.teacherId,

name:staff.name,

email:staff.email,

mobile:staff.mobile,

role:staff.role,

department:staff.department,

classId:staff.classId,

className:staff.className,

section:staff.section


}

});





}



catch(error:any){


return res.status(500).json({

success:false,

message:error.message

});


}


};









// ======================================
// STAFF REGISTER
// POST /api/staff/register
// ======================================

export const registerStaff = async (

req:Request,

res:Response

)=>{


try{


const {
name,
email,
mobile,
department,
role,
section,
classId,
className
}=req.body;




if(
!name ||
!email ||
!mobile ||
!role
){


return res.status(400).json({

success:false,

message:"Name Mobile Role required"

});


}







// Only Mentor and Manager

if(
role !== "mentor" &&
  role !== "manager" &&
  role !== "head"

){


return res.status(400).json({

success:false,

message:"Only Mentor and Manager allowed"

});


}










const existingStaff = await Staff.findOne({
  $or: [
    { email },
    { mobile }
  ]
});

if (existingStaff) {
  return res.status(400).json({
    success: false,
    message: "Registration Successful. Please wait for Manager approval because we verify details to keep student data secure from fake registrations."
  });
}








const staff = await Staff.create({

name,

mobile,

email,

department,

role,

classId,

className,

section,

isApproved:false,

accessCode:
"PENDING" + Date.now()

});



return res.json({

success:true,

message:"Registration sent to Head approval",

staff


});





}



catch(error:any){


return res.status(500).json({

success:false,

message:error.message

});


}


};