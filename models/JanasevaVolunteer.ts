
import mongoose, {
  Document,
  Model,
  Schema,
  Types,
} from "mongoose";

/* =========================================================
   TYPES
========================================================= */

export type VolunteerStatus =
  | "pending"
  | "approved"
  | "rejected";

export interface IVolunteerSession {
  sessionId: string;
  deviceId: string;
  createdAt: Date;
  lastActiveAt: Date;
}

export interface IJanasevaVolunteer
  extends Document {
  name: string;
  mobile: string;
  password: string;

  state: string;
  district: string;
  mandal: string;
  village: string;

  role: "volunteer";

  status: VolunteerStatus;

  isActive: boolean;

  registrationSource:
    | "volunteer_portal"
    | "staff";

  registeredBy?: Types.ObjectId;

  approvedBy?: Types.ObjectId;
  approvedAt?: Date;

  rejectedBy?: Types.ObjectId;
  rejectedAt?: Date;
  rejectionReason?: string;

  sessions: IVolunteerSession[];

  lastLoginAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

/* =========================================================
   SESSION SCHEMA
========================================================= */

const VolunteerSessionSchema =
  new Schema<IVolunteerSession>(
    {
      sessionId: {
        type: String,
        required: true,
      },

      deviceId: {
        type: String,
        required: true,
      },

      createdAt: {
        type: Date,
        default: Date.now,
      },

      lastActiveAt: {
        type: Date,
        default: Date.now,
      },
    },
    {
      _id: false,
    },
  );

/* =========================================================
   VOLUNTEER SCHEMA
========================================================= */

const JanasevaVolunteerSchema =
  new Schema<IJanasevaVolunteer>(
    {
      /* =====================================================
         BASIC DETAILS
      ===================================================== */

      name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 100,
      },

      /*
       * IMPORTANT:
       * Mobile number is unique.
       * Same mobile cannot be registered again.
       */
      mobile: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        index: true,
      },

      /*
       * Never store plain password.
       * Registration controller will bcrypt-hash it.
       */
      password: {
        type: String,
        required: true,
        select: false,
      },

      /* =====================================================
         LOCATION
      ===================================================== */

      state: {
        type: String,
        required: true,
        trim: true,
        default: "Andhra Pradesh",
      },

      district: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },

      mandal: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },

      village: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },

      /* =====================================================
         ROLE
      ===================================================== */

      role: {
        type: String,
        enum: ["volunteer"],
        default: "volunteer",
        required: true,
        index: true,
      },

      /* =====================================================
         APPROVAL STATUS
      ===================================================== */

      status: {
        type: String,
        enum: [
          "pending",
          "approved",
          "rejected",
        ],
        default: "pending",
        required: true,
        index: true,
      },

      /* =====================================================
         ACCESS CONTROL
      ===================================================== */

      /*
       * New registration:
       * false
       *
       * Staff approval:
       * true
       */
      isActive: {
        type: Boolean,
        default: false,
        index: true,
      },

      /* =====================================================
         REGISTRATION SOURCE
      ===================================================== */

      registrationSource: {
        type: String,
        enum: [
          "volunteer_portal",
          "staff",
        ],
        default: "volunteer_portal",
        required: true,
      },

      /*
       * If a staff member registers the volunteer,
       * save that staff user's ObjectId here.
       */
      registeredBy: {
        type: Schema.Types.ObjectId,
        ref: "JanasevaPortalUser",
      },

      /* =====================================================
         APPROVAL DETAILS
      ===================================================== */

      approvedBy: {
        type: Schema.Types.ObjectId,
        ref: "JanasevaPortalUser",
      },

      approvedAt: {
        type: Date,
      },

      /* =====================================================
         REJECTION DETAILS
      ===================================================== */

      rejectedBy: {
        type: Schema.Types.ObjectId,
        ref: "JanasevaPortalUser",
      },

      rejectedAt: {
        type: Date,
      },

      rejectionReason: {
        type: String,
        trim: true,
        maxlength: 500,
      },

      /* =====================================================
         VOLUNTEER LOGIN SESSIONS
      ===================================================== */

      sessions: {
        type: [VolunteerSessionSchema],
        default: [],
      },

      lastLoginAt: {
        type: Date,
      },
    },

    {
      timestamps: true,
      collection: "janaseva_volunteers",
    },
  );

/* =========================================================
   EXTRA INDEX
========================================================= */

/*
 * Explicit unique index for mobile.
 *
 * This protects against duplicate mobile numbers
 * at the MongoDB database level.
 */
JanasevaVolunteerSchema.index(
  { mobile: 1 },
  { unique: true },
);

/* =========================================================
   MODEL
========================================================= */

const JanasevaVolunteer: Model<IJanasevaVolunteer> =
  mongoose.models.JanasevaVolunteer ||
  mongoose.model<IJanasevaVolunteer>(
    "JanasevaVolunteer",
    JanasevaVolunteerSchema,
  );

export default JanasevaVolunteer;

