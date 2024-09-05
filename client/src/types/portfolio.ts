
export type Portfolio = {
  firstName: string,
  lastName: string,
  location: string,
  bio: string,
  sections: Section[],
};

export type Section = {
  title: string,
  projects: Project[],
};

export type Project = {
  name: string,
  description: string,
  imageURL?: string,
};

export const defaultProject: Project = {
  description: "", name: ""
};

export const defaultSection: Section = {
  projects: [defaultProject], title: ""
};

export const defaultPortfolio: Portfolio = {
  bio: "", location: "", firstName: "", lastName: "", sections: [defaultSection]
}
