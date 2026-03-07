import { UserProfile } from './UserProfile';

export class Staff extends UserProfile {
  staffID: number;
  department: string;

  constructor(
    name: string,
    staffID: number,
    department: string,
    accessibilityNeeds: boolean
  ) {
    super(name, accessibilityNeeds);
    this.staffID = staffID;
    this.department = department;
  }
}
