import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface INotificationPrefs extends Document {
  userId: string;
  channels: {
    inApp: boolean;
    email: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  language: 'en' | 'hi';
  createdAt: Date;
  updatedAt: Date;
}

const NotificationPrefsSchema = new Schema<INotificationPrefs>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    channels: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
    },
    quietHours: {
      enabled: { type: Boolean, default: false },
      start: { type: String, default: '22:00' },
      end: { type: String, default: '07:00' },
    },
    language: {
      type: String,
      enum: ['en', 'hi'],
      default: 'en',
    },
  },
  {
    timestamps: true,
    collection: 'notificationPrefs',
  },
);

export const NotificationPrefs: Model<INotificationPrefs> =
  mongoose.models.NotificationPrefs ||
  mongoose.model<INotificationPrefs>('NotificationPrefs', NotificationPrefsSchema);
