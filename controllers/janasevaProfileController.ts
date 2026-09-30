import { Request, Response } from "express";
import JanasevaUser from "../models/JanasevaUser";
import { JanasevaRequest } from "../middleware/janasevaAuth";

// ============================================================================
// GET PROFILE
// ============================================================================

export const getJanasevaProfile = async (
  req: JanasevaRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId =
      req.janasevaUser?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const user =
      await JanasevaUser.findById(
        userId,
      ).lean();

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User account not found.",
      });
      return;
    }

    if (user.isActive !== true) {
      res.status(403).json({
        success: false,
        message: "Your account is inactive.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      user: {
        id: String(user._id),
        name: user.name,
        mobile: user.mobile,
        state: user.state,
        district: user.district,
        mandal: user.mandal,
        village: user.village,
        role: user.role || "user",
        isActive: user.isActive,
        notificationEnabled:
          user.notificationEnabled ?? true,
        language:
          user.language || "English",
      },
    });
  } catch (error: any) {
    console.error(
      "❌ GET JANASEVA PROFILE ERROR:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "Unable to load your profile.",
    });
  }
};

// ============================================================================
// UPDATE PROFILE / PREFERENCES
// ============================================================================

export const updateJanasevaProfile = async (
  req: JanasevaRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId =
      req.janasevaUser?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const user =
      await JanasevaUser.findById(
        userId,
      );

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User account not found.",
      });
      return;
    }

    if (user.isActive !== true) {
      res.status(403).json({
        success: false,
        message: "Your account is inactive.",
      });
      return;
    }

    // ========================================================================
    // NAME
    // ========================================================================

    if (req.body?.name !== undefined) {
      const name =
        String(
          req.body.name,
        ).trim();

      if (
        name.length < 2 ||
        name.length > 80
      ) {
        res.status(400).json({
          success: false,
          field: "name",
          message:
            "Name must contain 2 to 80 characters.",
        });
        return;
      }

      user.name = name;
    }

    // ========================================================================
    // NOTIFICATIONS
    // ========================================================================

    if (
      req.body?.notificationEnabled !==
      undefined
    ) {
      user.notificationEnabled =
        Boolean(
          req.body.notificationEnabled,
        );
    }

    // ========================================================================
    // LANGUAGE
    // ========================================================================

    if (
      req.body?.language !== undefined
    ) {
      const language =
        String(
          req.body.language,
        ).trim();

      const allowedLanguages = [
        "English",
        "తెలుగు",
        "हिन्दी",
      ];

      if (
        !allowedLanguages.includes(
          language,
        )
      ) {
        res.status(400).json({
          success: false,
          field: "language",
          message:
            "Selected language is not supported.",
        });
        return;
      }

      user.language =
        language;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message:
        "Profile updated successfully.",
      user: {
        id: String(user._id),
        name: user.name,
        mobile: user.mobile,
        state: user.state,
        district: user.district,
        mandal: user.mandal,
        village: user.village,
        role: user.role || "user",
        isActive: user.isActive,
        notificationEnabled:
          user.notificationEnabled ?? true,
        language:
          user.language || "English",
      },
    });
  } catch (error: any) {
    console.error(
      "❌ UPDATE JANASEVA PROFILE ERROR:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "Unable to update your profile.",
    });
  }
};

// ============================================================================
// DELETE / DEACTIVATE ACCOUNT
// ============================================================================

export const deleteJanasevaAccount = async (
  req: JanasevaRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId =
      req.janasevaUser?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const user =
      await JanasevaUser.findById(
        userId,
      );

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User account not found.",
      });
      return;
    }

    // Soft delete
    user.isActive = false;

    await user.save();

    res.status(200).json({
      success: true,
      message:
        "Your account has been deactivated.",
    });
  } catch (error: any) {
    console.error(
      "❌ DELETE JANASEVA ACCOUNT ERROR:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "Unable to delete your account.",
    });
  }
};