import { Request, Response } from "express";
import Result from "../models/Result";
import QuestionBank from "../models/questionModel";

export const submitExam = async (req: Request, res: Response) => {
  try {
    const { 
      studentId, 
      studentName, 
      examId, 
      examName, 
      subject, 
      chapter, 
      totalQuestions, 
      attemptedQuestions,
      unansweredQuestions,
      correctAnswers, 
      wrongAnswers, 
      marks, 
      score, 
      percentage, 
      grade, 
      status, 
      timeTaken, 
      warnings,
      review, 
      answers 
    } = req.body;

    if (!studentId) {
      return res.status(400).json({ 
        success: false, 
        message: "Student ID is missing" 
      });
    }

    const finalMarks = marks !== undefined ? marks : (score !== undefined ? score : 0);
    const resolvedExamName = examName || chapter || "Physics/Chapter Test";
    const resolvedSubject = subject || "Physics";

    // 1. ఒకవేళ examId మరియు answers ఉంటే QuestionBank నుండి చెక్ చేసి సేవ్ చేస్తుంది
    if (examId && answers && Array.isArray(answers) && answers.length > 0) {
      const questions = await QuestionBank.find({ testId: examId });

      if (questions && questions.length > 0) {
        let correct = 0;
        let wrong = 0;
        let unanswered = 0;
        let totalMarks = 0;
        let maxPossibleMarks = 0;
        const reviewList: any[] = [];

        questions.forEach((question: any, index: number) => {
          const selectedAnswer = answers[index];
          const marksPerQ = question.marksPerQuestion || 4;
          const negMarks = question.negativeMarks || 1;

          maxPossibleMarks += marksPerQ;

          if (!selectedAnswer) {
            unanswered++;
          } else if (selectedAnswer === question.correctAnswer) {
            correct++;
            totalMarks += marksPerQ;
          } else {
            wrong++;
            totalMarks -= negMarks;
          }

          reviewList.push({
            questionId: question._id.toString(),
            question: question.question,
            selectedAnswer: selectedAnswer || "Not Attempted",
            correctAnswer: question.correctAnswer,
            isCorrect: selectedAnswer === question.correctAnswer,
            explanation: question.aiExplanation || ""
          });
        });

        const totalQ = questions.length;
        const attemptedQ = correct + wrong;
        const calcPercentage = maxPossibleMarks > 0 
          ? Number(((totalMarks / maxPossibleMarks) * 100).toFixed(2)) 
          : 0;

        let calcGrade = "F";
        let calcStatus: "PASS" | "FAIL" = "FAIL";

        if (calcPercentage >= 90) { calcGrade = "A+"; calcStatus = "PASS"; }
        else if (calcPercentage >= 75) { calcGrade = "A"; calcStatus = "PASS"; }
        else if (calcPercentage >= 60) { calcGrade = "B"; calcStatus = "PASS"; }
        else if (calcPercentage >= 40) { calcGrade = "C"; calcStatus = "PASS"; }

        const result = await Result.findOneAndUpdate(
          { studentId: studentId, examName: resolvedExamName },
          {
            studentId,
            studentName: studentName || "Student",
            examId,
            examName: resolvedExamName,
            subject: resolvedSubject,
            totalQuestions: totalQ,
            attemptedQuestions: attemptedQ,
            unansweredQuestions: unanswered,
            correctAnswers: correct,
            wrongAnswers: wrong,
            marks: totalMarks,
            percentage: calcPercentage,
            grade: calcGrade,
            status: calcStatus,
            timeTaken: timeTaken || 0,
            warnings: warnings || 0,
            review: reviewList
          },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        return res.status(200).json({
          success: true,
          message: "Exam evaluated and saved successfully!",
          result
        });
      }
    }

    // 2. Fallback: పైన ఏది మ్యాచ్ కాకపోయినా, ఫ్రంటెండ్ నుండి వచ్చిన డేటాను డైరెక్ట్ సేవ్ చేస్తుంది (400 ఎర్రర్ రాదు!)
    const updatedResult = await Result.findOneAndUpdate(
      { studentId: studentId, examName: resolvedExamName },
      {
        studentId,
        studentName: studentName || "Student",
        examId: examId || "PHYSICS_TEST",
        examName: resolvedExamName,
        subject: resolvedSubject,
        chapter: chapter || "",
        totalQuestions: totalQuestions || 0,
        attemptedQuestions: attemptedQuestions || 0,
        unansweredQuestions: unansweredQuestions || 0,
        correctAnswers: correctAnswers || 0,
        wrongAnswers: wrongAnswers || 0,
        marks: finalMarks,
        percentage: percentage || 0,
        grade: grade || "F",
        status: status || (percentage >= 40 ? "PASS" : "FAIL"),
        timeTaken: timeTaken || 0,
        warnings: warnings || 0,
        review: review || []
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({ 
      success: true, 
      message: "Result saved/updated successfully in MongoDB!",
      result: updatedResult 
    });

  } catch (error: any) {
    console.error("Error submitting exam:", error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};