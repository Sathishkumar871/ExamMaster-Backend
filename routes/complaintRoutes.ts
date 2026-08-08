import express, { Request, Response } from 'express';
import Complaint from '../models/Complaint';

const router = express.Router();

// 1. 🚀 Student: Submit New Complaint / Requirement (Strictly 1 per week)
router.post('/student/complaint', async (req: Request, res: Response): Promise<any> => {
  try {
    const { studentId, studentName, className, classId, description } = req.body;

    if (!studentId || !description) {
      return res.status(400).json({ success: false, message: "Student ID and description are required" });
    }

    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(diffToMonday));
    startOfWeek.setHours(0, 0, 0, 0);

    const existingThisWeek = await Complaint.findOne({
      studentId,
      createdAt: { $gte: startOfWeek }
    });

    if (existingThisWeek) {
      return res.status(400).json({ 
        success: false, 
        message: "⚠️ You can only submit 1 complaint/requirement per week!" 
      });
    }

    const newComplaint = new Complaint({
      studentId,
      studentName,
      className,
      classId,
      description,
      status: "Pending"
    });

    await newComplaint.save();

    return res.status(201).json({ 
      success: true, 
      message: "Complaint/Requirement submitted successfully", 
      complaint: newComplaint 
    });
  } catch (error) {
    console.error("Error submitting complaint:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// 2. 📋 Student: Get Their Own Complaints History
router.get('/student/complaints/:studentId', async (req: Request, res: Response): Promise<any> => {
  try {
    const { studentId } = req.params;
    const complaints = await Complaint.find({ studentId }).sort({ createdAt: -1 });

    return res.status(200).json({ success: true, complaints });
  } catch (error) {
    console.error("Error fetching student complaints:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// 3. 🗑️ Student: Delete/Cancel Their Own Pending Complaint
router.delete('/student/complaint/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const deletedComplaint = await Complaint.findByIdAndDelete(id);

    if (!deletedComplaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    return res.status(200).json({ success: true, message: "Complaint deleted successfully" });
  } catch (error) {
    console.error("Error deleting complaint:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// 4. 👨‍🏫 Teacher & 👑 Head: Get All Complaints & Counts
router.get('/teacher/complaints', async (req: Request, res: Response): Promise<any> => {
  try {
    const complaints = await Complaint.find().sort({ createdAt: -1 });

    const total = complaints.length;
    const resolved = complaints.filter(c => c.status === "Resolved").length;
    const pending = total - resolved;

    return res.status(200).json({ 
      success: true, 
      counts: { total, pending, resolved },
      complaints 
    });
  } catch (error) {
    console.error("Error fetching teacher complaints:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// 5. 🛠️ Teacher & 👑 Head: Mark Complaint as Resolved
router.put('/teacher/complaint/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const updatedComplaint = await Complaint.findByIdAndUpdate(
      id, 
      { status: "Resolved" }, 
      { new: true }
    );

    return res.status(200).json({ success: true, message: "Complaint marked as resolved", updatedComplaint });
  } catch (error) {
    console.error("Error updating complaint:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;