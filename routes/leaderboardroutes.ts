import { Router, Request, Response } from "express";
import Student from "../models/Student"; // Student మోడల్ మాత్రమే చాలు

const router = Router();

router.get("/leaderboard", async (req: Request, res: Response) => {
  try {
    const { pucClass } = req.query;

    if (!pucClass) {
      return res.status(400).json({ message: "pucClass required" });
    }

    const leaderboardData = await Student.aggregate([
      // 1. Student మోడల్‌లో ఉన్న className (ఉదా: 2nd PUC) తో ఫిల్టర్ చేయడం
      { $match: { className: pucClass } },

      // 2. studentId ఆధారంగా Results కలెక్షన్‌తో జాయిన్ చేయడం (Left Join)
      {
        $lookup: {
          from: "results", // MongoDB లో results కలెక్షన్ పేరు
          localField: "studentId", // Student మోడల్‌లో studentId
          foreignField: "studentId", // Result మోడల్‌లో studentId
          as: "allResults"
        }
      },

      // 3. Result మోడల్‌లో ఉన్న 'marks' ని టోటల్ చేయడం (ఎగ్జామ్ రాయకపోతే 0 వస్తుంది)
      {
        $addFields: {
          totalScore: { 
            $ifNull: [{ $sum: "$allResults.marks" }, 0] 
          },
          examsCompleted: { 
            $size: "$allResults" 
          }
        }
      },

      // 4. ఎక్కువ మార్కులు వచ్చిన వారిని టాప్‌లో ఉంచడం
      { $sort: { totalScore: -1 } },

      // 5. ఫైనల్ అవుట్‌పుట్
      {
        $project: {
          _id: 0,
          name: 1, // స్టూడెంట్ పేరు
          totalScore: 1,
          examsCompleted: 1,
          pucClass: "$className"
        }
      }
    ]);

    return res.status(200).json(leaderboardData);
  } catch (err) {
    console.error("Leaderboard Error:", err);
    return res.status(500).json({ message: "Server Error" });
  }
});

export default router;