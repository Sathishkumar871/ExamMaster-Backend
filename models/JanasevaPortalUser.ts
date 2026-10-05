import mongoose, {
  Document,
  Model,
  Schema,
} from "mongoose";

export interface IPortalSession {
  sessionId: string;
  deviceId: string;
  createdAt: Date;
  lastActiveAt: Date;
}

export interface IJanasevaPortalUser extends Document {
  name: string;
  adminId: string;
  email?: string;
  password: string;
  role: "admin" | "staff";
  isActive: boolean;
  sessions: IPortalSession[];
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PortalSessionSchema = new Schema<IPortalSession>(
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

const JanasevaPortalUserSchema =
  new Schema<IJanasevaPortalUser>(
    {
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
      },

      adminId: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        unique: true,
        index: true,
      },

      email: {
        type: String,
        trim: true,
        lowercase: true,
      },

      password: {
        type: String,
        required: true,
        select: false,
      },

      role: {
        type: String,
        enum: ["admin", "staff"],
        required: true,
        index: true,
      },

      isActive: {
        type: Boolean,
        default: true,
        index: true,
      },

      sessions: {
        type: [PortalSessionSchema],
        default: [],
      },

      lastLoginAt: {
        type: Date,
      },
    },
    {
      timestamps: true,
      collection: "janaseva_portal_users",
    },
  );

const JanasevaPortalUser: Model<IJanasevaPortalUser> =
  mongoose.models.JanasevaPortalUser ||
  mongoose.model<IJanasevaPortalUser>(
    "JanasevaPortalUser",
    JanasevaPortalUserSchema,
  );

export default JanasevaPortalUser;