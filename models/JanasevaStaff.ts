import mongoose, {
  Document,
  Model,
  Schema,
} from "mongoose";

/* =========================================================
   SESSION
========================================================= */

export interface IStaffSession {
  sessionId: string;
  deviceId: string;
  createdAt: Date;
  lastActiveAt: Date;
}

/* =========================================================
   STAFF INTERFACE
========================================================= */

export interface IJanasevaStaff extends Document {
  name: string;
  mobile: string;
  password: string;

  role: "staff";

  designation?: string;

  isActive: boolean;

  sessions: IStaffSession[];

  lastLoginAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

/* =========================================================
   SESSION SCHEMA
========================================================= */

const StaffSessionSchema =
  new Schema<IStaffSession>(
    {
      sessionId: {
        type: String,
        required: true,
        trim: true,
      },

      deviceId: {
        type: String,
        required: true,
        trim: true,
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
   STAFF SCHEMA
========================================================= */

const JanasevaStaffSchema =
  new Schema<IJanasevaStaff>(
    {
      /* =====================================================
         NAME
      ===================================================== */

      name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 100,
      },

      /* =====================================================
         MOBILE
         Staff login uses mobile number.
      ===================================================== */

      mobile: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        index: true,
      },

      /* =====================================================
         PASSWORD
         Always store bcrypt hash, never plain password.
      ===================================================== */

      password: {
        type: String,
        required: true,
        select: false,
      },

      /* =====================================================
         ROLE
      ===================================================== */

      role: {
        type: String,
        enum: ["staff"],
        default: "staff",
        required: true,
        index: true,
      },

      /* =====================================================
         DESIGNATION
         Optional internal title.
      ===================================================== */

      designation: {
        type: String,
        trim: true,
        maxlength: 100,
      },

      /* =====================================================
         ACCOUNT STATUS
      ===================================================== */

      isActive: {
        type: Boolean,
        default: true,
        index: true,
      },

      /* =====================================================
         ACTIVE DEVICES
         Maximum 2 is enforced by controller.
      ===================================================== */

      sessions: {
        type: [StaffSessionSchema],
        default: [],
      },

      /* =====================================================
         LAST LOGIN
      ===================================================== */

      lastLoginAt: {
        type: Date,
      },
    },
    {
      timestamps: true,
      collection: "janaseva_staff",
    },
  );

/* =========================================================
   UNIQUE MOBILE INDEX
========================================================= */

JanasevaStaffSchema.index(
  { mobile: 1 },
  {
    unique: true,
  },
);

/* =========================================================
   MODEL
========================================================= */

const JanasevaStaff: Model<IJanasevaStaff> =
  mongoose.models.JanasevaStaff ||
  mongoose.model<IJanasevaStaff>(
    "JanasevaStaff",
    JanasevaStaffSchema,
  );

export default JanasevaStaff;