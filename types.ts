
export interface ConversationMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: Date;
  summary?: string; // Optional summary for any long message
  imageUrl?: string; // To store a URL for a user-sent image
  fileName?: string; // To store the name of an uploaded file
  blockType?: 'code' | 'text' | 'prompt'; // To identify a message as a code block, text to copy, or prompt
}

export interface Conversation {
  id: string; // Firestore document ID
  uid: string; // Foreign key to user
  title: string;
  createdAt: Date; // From Firestore timestamp
  isArchived?: boolean; // To support the archive feature
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  subscriptionStatus: 'pending' | 'active' | 'inactive' | 'canceled';
  createdAt: Date;
  lastSeen?: Date; // New field to track when user was last active
  profilePicUrl?: string;
  theme?: string;
  customThemeColor?: string; // New field for custom accent color
  voiceName?: string; // Voice preference (e.g., 'Kore', 'Fenrir')
  textToSpeechEnabled?: boolean; // Preference to read text responses aloud
  usingOwnKey?: boolean; // Tracks if the user is using their own API key
  allowedIP?: string; // Security field to enforce single IP access
  termsAccepted?: boolean; // Tracks if the user accepted the terms
  termsAcceptedAt?: Date; // When the terms were accepted
  usage?: {
    totalTokens: number;
    totalCost: number;
    remainingTokens: number;
  };
  programmingLevel?: 'basic' | 'intermediate' | 'advanced';
}

export interface CustomAgent {
  id: string;
  name: string;
  description: string;
  systemInstruction: string;
  createdAt: Date;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  videoUrl?: string;
  linkUrl?: string; // URL for the clickable button
  linkText?: string; // Text for the clickable button
  createdAt: Date;
  viewCount?: number; // Tracks how many users have opened this notification
}

export interface BugReport {
  id: string;
  uid: string;
  userName: string;
  userEmail: string;
  whatsapp: string;
  description: string;
  screenshotUrl?: string;
  createdAt: Date;
  status: 'open' | 'resolved';
}