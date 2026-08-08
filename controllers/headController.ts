import { Response } from "express";

import Student from "../models/Student";
import Result from "../models/Result";
import DepartmentFeedback from "../models/DepartmentFeedback";
import Staff from "../models/Staff";



// ======================================
// HEAD DASHBOARD DATA
// GET /api/head/dashboard
// ======================================

export const getHeadDashboard = async (

  req:any,

  res:Response

) => {


  try {


    const totalStudents =
      await Student.countDocuments();



    const results =
      await Result.find()
      .sort({
        createdAt:-1
      });



    const feedback =
      await DepartmentFeedback.find()
      .sort({
        createdAt:-1
      });



    return res.json({


      success:true,


      dashboard:{


        totalStudents,


        totalResults:
          results.length,


        totalFeedback:
          feedback.length


      },


      students:
        await Student.find()
        .select(
          "name studentId className classId teacherId section"
        ),



      results,


      feedback



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
// GET PENDING STAFF REQUESTS
// GET /api/head/pending-staff
// ======================================

export const getPendingStaff = async (

req:any,

res:Response

)=>{


try{


const pendingStaff =

await Staff.find({

role:{
$in:[
"mentor",
"manager"
]
},


isApproved:false


})

.sort({

createdAt:-1

});




return res.json({

success:true,

staff:pendingStaff

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
// APPROVE STAFF
// PUT /api/head/approve/:id
// ======================================

export const approveStaff = async (

req:any,

res:Response

)=>{


try{


const {id}=req.params;



const staff =

await Staff.findById(id);



if(!staff){


return res.status(404).json({

success:false,

message:"Staff not found"

});


}




staff.isApproved = true;



// Generate access code after approval

if(!staff.accessCode){


staff.accessCode =

"STAFF" +

Math.floor(

100000 +

Math.random()*900000

);


}



await staff.save();




return res.json({

success:true,

message:"Staff Approved Successfully",

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







// ======================================
// REJECT STAFF
// DELETE /api/head/reject/:id
// ======================================

export const rejectStaff = async (

req:any,

res:Response

)=>{


try{


const {id}=req.params;



const staff =

await Staff.findById(id);



if(!staff){


return res.status(404).json({

success:false,

message:"Staff not found"

});


}



await Staff.findByIdAndDelete(id);



return res.json({

success:true,

message:"Staff Request Rejected"

});



}

catch(error:any){


return res.status(500).json({

success:false,

message:error.message

});


}


};