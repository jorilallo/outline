export type User = {
  id: string;
  name: string;
  email: string;
};

export type Team = {
  id: string;
  name: string;
};

export type UserTeams = {
  user: User;
  teams: Team[];
};
