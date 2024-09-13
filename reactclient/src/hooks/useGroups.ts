import { useEffect, useState } from "react";

export type Group = {
  key: string;
  name: string;
  members: Member[];
};

export type Member = {
  key: string;
  name: string;
};

const GROUPS_KEY = "groups";

export const useGroups = () => {
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    const groupString = localStorage.getItem(GROUPS_KEY);
    if (!groupString) {
      return;
    }

    const groups = (JSON.parse(groupString) as Group[]) ?? [];
    setGroups(groups);
  }, []);

  const addGroup = (group: Group) => {
    const newGroups = [...groups, group];
    localStorage.setItem(GROUPS_KEY, JSON.stringify(newGroups));
    setGroups(newGroups);
  };

  const removeGroup = (key: string) => {
    const newGroups = groups.filter((g) => g.key !== key);
    localStorage.setItem(GROUPS_KEY, JSON.stringify(newGroups));
    setGroups(newGroups);
  };

  return {
    groups,
    addGroup,
    removeGroup,
  };
};
