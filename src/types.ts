export interface Student {
  id: string;
  fullName: string;
  email: string;
  class: string;
  section: string;
  admissionNumber: string;
  createdAt: string;
}

export type EventStatus = 'Pending' | 'Approved' | 'Rejected';

export interface SchoolEvent {
  id: string;
  studentId: string;
  studentName: string; // denormalized for easy list display
  title: string;
  description: string;
  category: string;
  eventDate: string;
  image: string; // data URL or path
  status: EventStatus;
  createdAt: string;
  rejectionReason?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  timestamp: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export interface SystemSettings {
  boardTitle: string;
  autoModeration: boolean;
  tickerMessage: string;
}

export interface AdminUser {
  id: string;
  username: string;
}

export type ActivePage =
  | 'Home'
  | 'SignUp'
  | 'Login'
  | 'AdminLogin'
  | 'StudentDashboard'
  | 'AdminDashboard'
  | 'PHPExporter';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
