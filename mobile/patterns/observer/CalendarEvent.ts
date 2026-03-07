export class CalendarEvent {
  date: string;
  startTime: number;
  endTime: number;
  course: string;

  constructor(date: string, startTime: number, endTime: number, course: string) {
    this.date = date;
    this.startTime = startTime;
    this.endTime = endTime;
    this.course = course;
  }
}
