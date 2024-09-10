export type Font = "sans" | "serif" | "mono";

export type Portfolio = {
  firstName: string,
  lastName: string,
  location: string,
  bio: string,
  sections: Section[],
  sidebarColor: string,
  backgroundColor: string,
  projectColor: string,
  accentColor: string,
  font: Font,
};

export type Section = {
  title: string,
  projects: Project[],
};

export type Project = {
  name: string,
  description: string,
  link?: string,
  imageURL?: string,
};

export const defaultProject: Project = {
  description: "", name: ""
};

export const defaultSection: Section = {
  projects: [defaultProject], title: ""
};
