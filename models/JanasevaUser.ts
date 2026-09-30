import mongoose, {
  Document,
  Model,
  Schema,
} from "mongoose";

export interface IJanasevaUser extends Document {
  name: string;
  mobile: string;
  state: string;
  district: string;
  mandal: string;
  village: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const JanasevaUserSchema =
  new Schema<IJanasevaUser>(
    {
      name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 100,
      },

      mobile: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        index: true,
      },

      state: {
        type: String,
        required: true,
        default: "Andhra Pradesh",
        trim: true,
      },

      district: {
        type: String,
        required: true,
        trim: true,
      },

      mandal: {
        type: String,
        required: true,
        trim: true,
      },

      village: {
        type: String,
        required: true,
        trim: true,
      },

      role: {
        type: String,
        default: "user",
        trim: true,
      },

      isActive: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
      collection: "janaseva_users",
    },
  );

const JanasevaUser: Model<IJanasevaUser> =
  mongoose.models.JanasevaUser ||
  mongoose.model<IJanasevaUser>(
    "JanasevaUser",
    JanasevaUserSchema,
  );

export default JanasevaUser;