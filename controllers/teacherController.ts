
import { Request, Response } from "express";
import jwt from "jsonwebtoken";

import Result from "../models/Result";
import Teacher from "../models/Teacher";
import Student from "../models/Student";
import DepartmentFeedback from "../models/DepartmentFeedback";


// ============================================================
// TYPES / HELPERS
// ============================================================

const getTeacher = (req: Request): any => {
  return (req as any).teacher || null;
};


const getStaff = (req: Request): any => {
  return (req as any).staff || null;
};


// ============================================================
// TEACHER LOGIN
// ============================================================

export const teacherLogin = async (
  req: Request,
  res: Response
) => {

  try {

    const {
      teacherId,
      accessCode,
    } = req.body;


    if (
      !teacherId ||
      !accessCode
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Teacher ID and Access Code required",

      });

    }


    const teacher =
      await Teacher.findOne({
        teacherId,
        accessCode,
      });


    if (!teacher) {

      return res.status(404).json({

        success: false,

        message:
          "Invalid Teacher ID or Access Code",

      });

    }


    if (!teacher.isApproved) {

      return res.status(403).json({

        success: false,

        message:
          "Teacher not approved",

      });

    }


    const teacherType =
      teacher.teacherType ||
      "teacher";


    const token =
      jwt.sign(

        {

          id:
            teacher._id,

          teacherId:
            teacher.teacherId,

          name:
            teacher.name,

          subject:
            teacher.subject,

          classIds:
            teacher.classIds,

          classNames:
            teacher.classNames,

          sections:
            teacher.sections,

          role:
            "teacher",

          teacherType,

        },

        process.env.JWT_SECRET as string,

        {
          expiresIn:
            "7d",
        }

      );


    return res.json({

      success: true,

      message:
        "Teacher Login Success",

      token,

      redirect:
        teacherType === "mentor"
          ? "/mentor-dashboard"
          : "/teacher-dashboard",

      teacher: {

        id:
          teacher._id,

        teacherId:
          teacher.teacherId,

        name:
          teacher.name,

        classIds:
          teacher.classIds,

        classNames:
          teacher.classNames,

        sections:
          teacher.sections,

        subject:
          teacher.subject,

        teacherType,

      },

    });

  }

  catch (error: any) {

    console.error(
      "TEACHER LOGIN ERROR:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        error.message ||
        "Teacher login failed",

    });

  }

};


// ============================================================
// GET STUDENTS PERFORMANCE
// ============================================================

export const getStudentsPerformance = async (
  req: Request,
  res: Response
) => {

  try {

    const teacher: any =
      getTeacher(req);


    if (!teacher) {

      return res.status(401).json({

        success: false,

        message:
          "Teacher session not found",

        code:
          "UNAUTHORIZED",

      });

    }


    const classIds =
      Array.isArray(
        teacher.classIds
      )
        ? teacher.classIds
        : [];


    const sections =
      Array.isArray(
        teacher.sections
      )
        ? teacher.sections
        : [];


    if (
      classIds.length === 0
    ) {

      return res.json({

        success:
          true,

        students:
          [],

        mentorFeedback:
          [],

      });

    }


    const students =
      await Student.find({

        classId: {
          $in:
            classIds,
        },

        ...(sections.includes(
          "ALL"
        )
          ? {}
          : {
              section: {
                $in:
                  sections,
              },
            }),

      });


    const studentIds =
      students.map(
        (student: any) =>
          student.studentId
      );


    const allResults =
      await Result.find({

        studentId: {
          $in:
            studentIds,
        },

      })
        .sort({
          createdAt:
            -1,
        });


    const mentorFeedback =
      await DepartmentFeedback.find({

        studentId: {
          $in:
            studentIds,
        },

      })
        .sort({
          createdAt:
            -1,
        });


    const studentData =
      students.map(
        (student: any) => {

          const results =
            allResults.filter(
              (item: any) =>
                item.studentId ===
                student.studentId
            );


          let totalPercentage =
            0;

          let highestMarks =
            0;

          let correctAnswers =
            0;

          let wrongAnswers =
            0;

          let pass =
            0;

          let fail =
            0;


          results.forEach(
            (item: any) => {

              totalPercentage +=
                Number(
                  item.percentage ||
                  0
                );


              correctAnswers +=
                Number(
                  item.correctAnswers ||
                  0
                );


              wrongAnswers +=
                Number(
                  item.wrongAnswers ||
                  0
                );


              if (
                Number(
                  item.marks ||
                  0
                ) >
                highestMarks
              ) {

                highestMarks =
                  Number(
                    item.marks ||
                    0
                  );

              }


              if (
                item.status ===
                "PASS"
              ) {

                pass++;

              }

              else {

                fail++;

              }

            }
          );


          return {

            _id:
              student._id,

            studentId:
              student.studentId,

            name:
              student.name,

            email:
              student.email,

            classId:
              student.classId,

            className:
              student.className,

            section:
              student.section,

            totalExams:
              results.length,

            average:
              results.length > 0
                ? Number(
                    (
                      totalPercentage /
                      results.length
                    ).toFixed(2)
                  )
                : 0,

            highestMarks,

            correctAnswers,

            wrongAnswers,

            pass,

            fail,

            results,

          };

        }
      );


    return res.json({

      success:
        true,

      students:
        studentData,

      mentorFeedback,

    });

  }

  catch (error: any) {

    console.error(
      "GET STUDENTS PERFORMANCE ERROR:",
      error
    );


    return res.status(500).json({

      success:
        false,

      message:
        error.message ||
        "Failed to fetch student performance",

    });

  }

};


// ============================================================
// TOP STUDENTS
// ============================================================

export const getTopStudents = async (
  req: Request,
  res: Response
) => {

  try {

    const teacher: any =
      getTeacher(req);


    if (!teacher) {

      return res.status(401).json({

        success: false,

        message:
          "Teacher session not found",

      });

    }


    const classIds =
      Array.isArray(
        teacher.classIds
      )
        ? teacher.classIds
        : [];


    const sections =
      Array.isArray(
        teacher.sections
      )
        ? teacher.sections
        : [];


    if (
      classIds.length === 0
    ) {

      return res.json({

        success:
          true,

        students:
          [],

      });

    }


    const students =
      await Student.find({

        classId: {
          $in:
            classIds,
        },

        ...(sections.includes(
          "ALL"
        )
          ? {}
          : {
              section: {
                $in:
                  sections,
              },
            }),

      });


    const studentIds =
      students.map(
        (student: any) =>
          student.studentId
      );


    const topStudents =
      await Result.aggregate([

        {
          $match: {

            studentId: {
              $in:
                studentIds,
            },

          },

        },

        {
          $group: {

            _id:
              "$studentId",

            studentName: {
              $first:
                "$studentName",
            },

            average: {
              $avg:
                "$percentage",
            },

          },

        },

        {
          $sort: {

            average:
              -1,

          },

        },

        {
          $limit:
            10,

        },

      ]);


    return res.json({

      success:
        true,

      students:
        topStudents,

    });

  }

  catch (error: any) {

    console.error(
      "GET TOP STUDENTS ERROR:",
      error
    );


    return res.status(500).json({

      success:
        false,

      message:
        error.message ||
        "Failed to fetch top students",

    });

  }

};


// ============================================================
// SUBJECT ANALYSIS
// ============================================================

export const getSubjectAnalysis = async (
  req: Request,
  res: Response
) => {

  try {

    const teacher: any =
      getTeacher(req);


    if (!teacher) {

      return res.status(401).json({

        success:
          false,

        message:
          "Teacher session not found",

      });

    }


    const classIds =
      Array.isArray(
        teacher.classIds
      )
        ? teacher.classIds
        : [];


    const sections =
      Array.isArray(
        teacher.sections
      )
        ? teacher.sections
        : [];


    const students =
      await Student.find({

        classId: {
          $in:
            classIds,
        },

        ...(sections.includes(
          "ALL"
        )
          ? {}
          : {
              section: {
                $in:
                  sections,
              },
            }),

      });


    const studentIds =
      students.map(
        (student: any) =>
          student.studentId
      );


    const data =
      await Result.aggregate([

        {
          $match: {

            studentId: {
              $in:
                studentIds,
            },

          },

        },

        {
          $group: {

            _id:
              "$subject",

            averagePercentage: {
              $avg:
                "$percentage",
            },

            totalAttempts: {
              $sum:
                1,
            },

          },

        },

        {
          $sort: {

            averagePercentage:
              -1,

          },

        },

      ]);


    return res.json({

      success:
        true,

      data,

    });

  }

  catch (error: any) {

    console.error(
      "GET SUBJECT ANALYSIS ERROR:",
      error
    );


    return res.status(500).json({

      success:
        false,

      message:
        error.message ||
        "Failed to fetch subject analysis",

    });

  }

};


// ============================================================
// ALL STUDENT RESULTS
// RESULTS MANAGEMENT
//
// TEACHER:
//   Only assigned class/section students
//
// STAFF:
//   All students + all results
//
// Supports:
//   Total students
//   Total exams
//   Pass / Fail
//   Average
//   Highest
//   Student data
//   Exam data
//   Class
//   Section
// ============================================================

export const getAllStudentResults = async (
  req: Request,
  res: Response
) => {

  try {

    const teacher: any =
      getTeacher(req);

    const staff: any =
      getStaff(req);


    // ========================================================
    // DETERMINE USER TYPE
    // ========================================================

    const isStaff =
      !!staff;

    const isTeacher =
      !!teacher;


    if (
      !isStaff &&
      !isTeacher
    ) {

      return res.status(401).json({

        success:
          false,

        message:
          "Management session not found",

        code:
          "UNAUTHORIZED",

      });

    }


    // ========================================================
    // STUDENT QUERY
    // ========================================================

    let studentQuery: any =
      {};


    // ========================================================
    // STAFF
    // ========================================================
    //
    // Staff/Management can see
    // all students.
    //
    // This is useful for the
    // Results Management page.
    //
    // ========================================================

    if (isStaff) {

      studentQuery = {};

    }


    // ========================================================
    // TEACHER
    // ========================================================

    if (
      isTeacher &&
      !isStaff
    ) {

      const classIds =
        Array.isArray(
          teacher.classIds
        )
          ? teacher.classIds
          : [];


      const sections =
        Array.isArray(
          teacher.sections
        )
          ? teacher.sections
          : [];


      if (
        classIds.length ===
        0
      ) {

        return res.json({

          success:
            true,

          count:
            0,

          totalStudents:
            0,

          totalExams:
            0,

          passCount:
            0,

          failCount:
            0,

          averagePercentage:
            0,

          highestPercentage:
            0,

          results:
            [],

        });

      }


      studentQuery = {

        classId: {
          $in:
            classIds,
        },

      };


      if (
        sections.length > 0 &&
        !sections.includes(
          "ALL"
        )
      ) {

        studentQuery.section = {

          $in:
            sections,

        };

      }

    }


    // ========================================================
    // FIND STUDENTS
    // ========================================================

    const students =
      await Student.find(
        studentQuery
      )
        .lean();


    // ========================================================
    // STUDENT IDS
    // ========================================================

    const studentIds =
      students.map(
        (student: any) =>
          student.studentId
      );


    // ========================================================
    // NO STUDENTS
    // ========================================================

    if (
      studentIds.length ===
      0
    ) {

      return res.json({

        success:
          true,

        count:
          0,

        totalStudents:
          0,

        totalExams:
          0,

        passCount:
          0,

        failCount:
          0,

        averagePercentage:
          0,

        highestPercentage:
          0,

        results:
          [],

      });

    }


    // ========================================================
    // GET RESULTS
    // ========================================================

    const allResults =
      await Result.find({

        studentId: {

          $in:
            studentIds,

        },

      })

        .sort({

          createdAt:
            -1,

        })

        .lean();


    // ========================================================
    // STUDENT MAP
    // ========================================================

    const studentMap =
      new Map<
        string,
        any
      >();


    students.forEach(
      (student: any) => {

        studentMap.set(

          student.studentId,

          student

        );

      }
    );


    // ========================================================
    // COMBINE RESULT + STUDENT
    // ========================================================

    const results =
      allResults.map(
        (result: any) => {

          const student =
            studentMap.get(
              result.studentId
            );


          return {

            // =================================================
            // RESULT
            // =================================================

            _id:
              result._id,

            studentId:
              result.studentId,

            studentName:
              result.studentName ||
              student?.name ||
              "Unknown Student",

            examId:
              result.examId,

            examName:
              result.examName,

            testCategory:
              result.testCategory,

            subject:
              result.subject,

            chapter:
              result.chapter,

            totalQuestions:
              Number(
                result.totalQuestions ||
                0
              ),

            attemptedQuestions:
              Number(
                result.attemptedQuestions ||
                0
              ),

            unansweredQuestions:
              Number(
                result.unansweredQuestions ||
                0
              ),

            correctAnswers:
              Number(
                result.correctAnswers ||
                0
              ),

            wrongAnswers:
              Number(
                result.wrongAnswers ||
                0
              ),

            marks:
              Number(
                result.marks ||
                0
              ),

            percentage:
              Number(
                result.percentage ||
                0
              ),

            grade:
              result.grade ||
              "",

            status:
              result.status ===
              "PASS"
                ? "PASS"
                : "FAIL",

            timeTaken:
              Number(
                result.timeTaken ||
                0
              ),

            warnings:
              Number(
                result.warnings ||
                0
              ),

            review:
              result.review ||
              [],

            submittedAt:
              result.createdAt,

            createdAt:
              result.createdAt,

            updatedAt:
              result.updatedAt,


            // =================================================
            // STUDENT
            // =================================================

            email:
              student?.email ||
              "",

            classId:
              student?.classId ||
              "",

            className:
              student?.className ||
              "",

            section:
              student?.section ||
              "",

            year:
              student?.year ||
              student?.className ||
              "",

          };

        }
      );


    // ========================================================
    // UNIQUE STUDENTS
    // ========================================================

    const totalStudents =
      new Set(
        students.map(
          (student: any) =>
            student.studentId
        )
      ).size;


    // ========================================================
    // UNIQUE EXAMS
    // ========================================================

    const totalExams =
      new Set(
        allResults.map(
          (result: any) =>
            result.examId ||
            result.examName
        )
      ).size;


    // ========================================================
    // TOTAL RESULTS
    // ========================================================

    const totalResults =
      allResults.length;


    // ========================================================
    // PASS
    // ========================================================

    const passCount =
      allResults.filter(
        (result: any) =>
          result.status ===
          "PASS"
      ).length;


    // ========================================================
    // FAIL
    // ========================================================

    const failCount =
      allResults.filter(
        (result: any) =>
          result.status ===
          "FAIL"
      ).length;


    // ========================================================
    // AVERAGE
    // ========================================================

    const averagePercentage =
      totalResults > 0
        ? Number(

            (

              allResults.reduce(

                (
                  total: number,
                  result: any
                ) =>

                  total +
                  Number(
                    result.percentage ||
                    0
                  ),

                0

              ) /

              totalResults

            ).toFixed(2)

          )

        : 0;


    // ========================================================
    // HIGHEST PERCENTAGE
    // ========================================================

    const highestPercentage =
      totalResults > 0

        ? Math.max(

            ...allResults.map(
              (result: any) =>
                Number(
                  result.percentage ||
                  0
                )
            )

          )

        : 0;


    // ========================================================
    // PASS PERCENTAGE
    // ========================================================

    const passPercentage =
      totalResults > 0
        ? Number(

            (
              (
                passCount /
                totalResults
              ) *
              100
            ).toFixed(2)

          )

        : 0;


    // ========================================================
    // FAIL PERCENTAGE
    // ========================================================

    const failPercentage =
      totalResults > 0
        ? Number(

            (
              (
                failCount /
                totalResults
              ) *
              100
            ).toFixed(2)

          )

        : 0;


    // ========================================================
    // RETURN
    // ========================================================

    return res.json({

      success:
        true,

      count:
        results.length,

      totalResults,

      totalStudents,

      totalExams,

      passCount,

      failCount,

      passPercentage,

      failPercentage,

      averagePercentage,

      highestPercentage,

      results,

    });

  }

  catch (error: any) {

    console.error(
      "GET ALL STUDENT RESULTS ERROR:",
      error
    );


    return res.status(500).json({

      success:
        false,

      message:
        error.message ||
        "Failed to fetch all student results",

    });

  }

};
