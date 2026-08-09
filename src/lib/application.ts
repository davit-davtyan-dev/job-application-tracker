export enum ApplicationStatus {
  Applied = "Applied",
  Interviewing = "Interviewing",
  Offer = "Offer",
  Accepted = "Accepted",
  Rejected = "Rejected",
  Withdrawn = "Withdrawn",
  Archived = "Archived",
}

export const ApplicationListView = {
  Active: "active",
  Closed: "closed",
} as const;

export type ApplicationListView =
  (typeof ApplicationListView)[keyof typeof ApplicationListView];
