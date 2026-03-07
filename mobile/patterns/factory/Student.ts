import { UserProfile } from './UserProfile';
import type { CalendarEvent } from '../observer/CalendarEvent';

export class Student extends UserProfile {
  studentID: number;
  program: string;

  constructor(
    name: string,
    studentID: number,
    program: string,
    accessibilityNeeds: boolean
  ) {
    super(name, accessibilityNeeds);
    this.studentID = studentID;
    this.program = program;
  }

  update(event: CalendarEvent): void {
    console.log(
      `Student ${this.name} (${this.program}): Upcoming class ${event.course} on ${event.date}`
    );
  }
}
