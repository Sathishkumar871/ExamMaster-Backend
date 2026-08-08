import { Response } from "express";

import DepartmentFeedback from "../models/DepartmentFeedback";




// ======================================
// GET MANAGER DEPARTMENT DATA
// GET /api/manager/department
// ======================================

export const getManagerDepartmentData = async (

req:any,

res:Response

)=>{


try{


const manager = req.staff;



if(!manager){

return res.status(401).json({

success:false,

message:"Manager login required"

});

}





const department = manager.department;



if(!department){

return res.status(400).json({

success:false,

message:"Department not assigned"

});

}







let filter:any = {};



// Department based view


if(department==="health"){

filter={
"health.status":{$exists:true}
};

}


else if(department==="food"){

filter={
"food.quality":{$exists:true}
};

}



else if(department==="hostel"){

filter={
"hostel.status":{$exists:true}
};

}



else if(department==="academic"){

filter={
"academic.performance":{$exists:true}
};

}



else if(department==="behavior"){

filter={
"behavior.discipline":{$exists:true}
};

}








const data = await DepartmentFeedback.find(filter)

.sort({

createdAt:-1

});







return res.json({

success:true,


department,


total:data.length,


data


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
// MANAGER ADD UPDATE
// PUT /api/manager/feedback
// ======================================


export const addManagerFeedback = async (


req:any,


res:Response


)=>{


try{


const manager = req.staff;




if(!manager){


return res.status(401).json({

success:false,

message:"Manager login required"

});

}





const {


studentId,


studentName,


classId,


className,


section,



health,


food,


hostel,


behavior,


academic,


mentorActionPlan,


shareTo



}=req.body;









if(!studentId){


return res.status(400).json({

success:false,

message:"Student ID required"

});

}









const saved = await DepartmentFeedback.findOneAndUpdate(


{


studentId


},



{


studentId,


studentName,


classId,


className,


section,



health,


food,


hostel,


behavior,


academic,


mentorActionPlan,



shareTo:shareTo || "none",



sourceType:"manager",



updatedBy:manager.name,



updatedByRole:"manager"



},



{


new:true,


upsert:true


}



);








return res.json({


success:true,


message:"Department update saved successfully",


data:saved



});



}



catch(error:any){


return res.status(500).json({

success:false,

message:error.message

});


}


};