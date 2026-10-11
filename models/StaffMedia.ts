
import mongoose, {
  Document,
  Model,
  Schema,
} from "mongoose";

export type StaffMediaKind =
  | "image"
  | "video";

export interface IStaffMedia
  extends Document {
  caption: string;
  mediaType: StaffMediaKind;
  url: string;
  thumbnailUrl?: string;
  imageKitFileId: string;
  fileName: string;
  mimeType: string;
  size: number;
  isPublished: boolean;
  publishedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const StaffMediaSchema =
  new Schema<IStaffMedia>(
    {
      caption: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 500,
      },

      mediaType: {
        type: String,
        enum: ["image", "video"],
        required: true,
        index: true,
      },

      url: {
        type: String,
        required: true,
        trim: true,
      },

      thumbnailUrl: {
        type: String,
        trim: true,
        default: "",
      },

      imageKitFileId: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },

      fileName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 255,
      },

      mimeType: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150,
      },

      size: {
        type: Number,
        required: true,
        min: 0,
      },

      isPublished: {
        type: Boolean,
        default: false,
        index: true,
      },

      publishedAt: {
        type: Date,
        default: null,
      },

      createdBy: {
        type: String,
        required: true,
        index: true,
      },
    },
    {
      timestamps: true,
      collection: "janaseva_staff_media",
      versionKey: false,
    },
  );

StaffMediaSchema.index({
  isPublished: 1,
  publishedAt: -1,
  createdAt: -1,
});

StaffMediaSchema.index({
  mediaType: 1,
  createdAt: -1,
});

const StaffMedia: Model<IStaffMedia> =
  mongoose.models.StaffMedia ||
  mongoose.model<IStaffMedia>(
    "StaffMedia",
    StaffMediaSchema,
  );

export default StaffMedia;
