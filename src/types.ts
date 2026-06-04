export interface QueueEntry {
  uid: string;
  status: 'waiting' | 'matched';
  sessionId?: string;
  createdAt: any; // Firestore Timestamp
}

export interface ChatSession {
  id?: string;
  participants: string[];
  status: 'active' | 'ended';
  createdAt: any; // Firestore Timestamp
}

export interface ChatMessage {
  id?: string;
  senderId: string;
  text: string;
  createdAt: any; // Firestore Timestamp
}
