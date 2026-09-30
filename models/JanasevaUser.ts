
import mongoose, {
  Document,
  Model,
  Schema,
} from "mongoose";

// ============================================================================
// JANASEVA USER INTERFACE
// ============================================================================

export interface IJanasevaUser extends Document {
  name: string;
  mobile: string;

  state: string;
  district: string;
  mandal: string;
  village: string;

  role: string;
  isActive: boolean;

  // Account preferences
  notificationEnabled: boolean;
  language: string;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// SCHEMA
// ============================================================================

const JanasevaUserSchema =
  new Schema<IJanasevaUser>(
    {
      // ======================================================================
      // NAME
      // ======================================================================

      name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 100,
      },

      // ======================================================================
      // MOBILE
      // ======================================================================

      mobile: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        index: true,
      },

      // ======================================================================
      // STATE
      // ======================================================================

      state: {
        type: String,
        required: true,
        default: "Andhra Pradesh",
        trim: true,
      },

      // ======================================================================
      // DISTRICT
      // ======================================================================

      district: {
        type: String,
        required: true,
        trim: true,
      },

      // ======================================================================
      // MANDAL
      // ======================================================================

      mandal: {
        type: String,
        required: true,
        trim: true,
      },

      // ======================================================================
      // VILLAGE
      // ======================================================================

      village: {
        type: String,
        required: true,
        trim: true,
      },

      // ======================================================================
      // ROLE
      // ======================================================================

      role: {
        type: String,
        default: "user",
        trim: true,
      },

      // ======================================================================
      // ACCOUNT STATUS
      // ======================================================================

      isActive: {
        type: Boolean,
        default: true,
      },

      // ======================================================================
      // NOTIFICATIONS
      // ======================================================================

      notificationEnabled: {
        type: Boolean,
        default: true,
      },

      // ======================================================================
      // LANGUAGE
      // ======================================================================

      language: {
        type: String,
        enum: [
          "English",
          "తెలుగు",
          "हिन्दी",
        ],
        default: "English",
        trim: true,
      },
    },
    {
      timestamps: true,
      collection: "janaseva_users",
    },
  );

// ============================================================================
// MODEL
// ============================================================================

const JanasevaUser: Model<IJanasevaUser> =
  mongoose.models.JanasevaUser ||
  mongoose.model<IJanasevaUser>(
    "JanasevaUser",
    JanasevaUserSchema,
  );

export default JanasevaUser;

