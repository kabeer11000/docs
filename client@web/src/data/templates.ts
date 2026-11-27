// The only templates. Plain structure, no colours or decoration: the document's own styles do the work.
export interface Template {
  id: string;
  name: string;
  description: string;
  content: string;
}

export const TEMPLATES: Template[] = [
  {
    id: "meeting-notes",
    name: "Meeting notes",
    description: "Agenda, decisions and action items",
    content: `<h1>Meeting notes</h1>
<p><strong>Date:</strong> <br><strong>Attendees:</strong> </p>
<h2>Agenda</h2>
<ol><li><p></p></li><li><p></p></li><li><p></p></li></ol>
<h2>Notes</h2>
<p></p>
<h2>Decisions</h2>
<ul><li><p></p></li></ul>
<h2>Action items</h2>
<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Owner: task, due date</p></div></li></ul>`,
  },
  {
    id: "project-brief",
    name: "Project brief",
    description: "Goal, scope, milestones and risks",
    content: `<h1>Project brief</h1>
<p>One sentence on what this project is and why it matters now.</p>
<h2>Goal</h2>
<p>What does success look like, and how will we measure it?</p>
<h2>Scope</h2>
<p><strong>In scope</strong></p>
<ul><li><p></p></li></ul>
<p><strong>Out of scope</strong></p>
<ul><li><p></p></li></ul>
<h2>Milestones</h2>
<table><tbody><tr><th><p>Milestone</p></th><th><p>Owner</p></th><th><p>Date</p></th></tr><tr><td><p></p></td><td><p></p></td><td><p></p></td></tr><tr><td><p></p></td><td><p></p></td><td><p></p></td></tr></tbody></table>
<h2>Risks</h2>
<ul><li><p></p></li></ul>`,
  },
  {
    id: "weekly-update",
    name: "Weekly update",
    description: "What shipped, what is next, what is blocked",
    content: `<h1>Weekly update</h1>
<p><strong>Week of:</strong> </p>
<h2>Shipped</h2>
<ul><li><p></p></li></ul>
<h2>Next week</h2>
<ul><li><p></p></li></ul>
<h2>Blocked</h2>
<ul><li><p>What is blocked, and who can unblock it</p></li></ul>
<h2>Numbers</h2>
<p></p>`,
  },
  {
    id: "letter",
    name: "Letter",
    description: "A formal letter, ready to print",
    content: `<p>Your name<br>Street address<br>City, postcode<br>Email</p>
<p>Date</p>
<p>Recipient name<br>Organisation<br>Street address<br>City, postcode</p>
<p>Dear Recipient,</p>
<p>State the purpose of the letter in the first sentence.</p>
<p>Add the details the reader needs in one or two short paragraphs.</p>
<p>Close with what you would like to happen next.</p>
<p>Sincerely,</p>
<p>Your name</p>`,
  },
  {
    id: "resume",
    name: "Resume",
    description: "One page: experience, education, skills",
    content: `<h1>Your Name</h1>
<p>City, email@example.com, linkedin.com/in/you</p>
<h2>Experience</h2>
<p><strong>Role, Company</strong> <br>Start - End</p>
<ul><li><p>Result you delivered, with a number</p></li><li><p>Result you delivered, with a number</p></li></ul>
<p><strong>Role, Company</strong> <br>Start - End</p>
<ul><li><p>Result you delivered, with a number</p></li></ul>
<h2>Education</h2>
<p><strong>Degree, School</strong> <br>Year</p>
<h2>Skills</h2>
<p></p>`,
  },
];
