# Job Application Tracker — Product Brief

## Product Overview

Job Application Tracker is a general job-application tracking web application. Its initial version supports a single user and is designed primarily for desktop use while remaining usable on smaller screens.

The application tracks jobs only after an application has been submitted.

## Core Product Experience

The default experience is a list of active job applications. Users can search job applications by company name or position title and filter the list between active and closed statuses.

The application provides a clear history of previous job applications for each company so users can review earlier applications before submitting another one.

## Core Records

### Company

A company is stored independently from its job applications.

A company can have:

- Multiple job applications
- General company notes

When creating a job application, the user selects an existing company or creates a new company.

### Job Application

Each job application belongs to one company.

A job application includes:

- Company
- Position title
- Applied date
- Current status
- Optional job description
- Optional reference links
- Application notes
- Individual interview records
- Chronological activity history

The applied date defaults to the current date and can be edited.

Job applications are created manually.

## Job Application Statuses

The product uses the following fixed statuses:

### Active

- Applied
- Interviewing
- Offer

### Closed

- Accepted
- Rejected
- Withdrawn
- Archived

Users can change directly from any status to any other status.

A stale or no-response indicator may be shown without changing the job application's status.

## Interviews

A job application can contain multiple individual interview records.

Each interview has one of the following states:

- Scheduled
- Completed
- Cancelled

## Activity History

Each job application has a chronological history of significant events.

History entries include:

- Job application created
- Status changed
- Interview scheduled
- Interview completed
- Interview cancelled
- Note added

Status history records the previous and new values, for example:

> Status changed from Applied to Rejected.

Only the current status is stored as the job application's active status.

## Search and Filtering

Users can search job applications by:

- Company name
- Position title

Users can filter applications by:

- Active
- Closed

The default view shows active job applications.

## Future Capabilities

Planned future capabilities, in priority order:

1. Automatic job-posting metadata extraction
2. Follow-up tasks and reminders
3. Interview rounds
4. Analytics
5. Custom statuses
