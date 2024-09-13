import { useEffect, useState } from "react";

export type User = {
  id: string;
  name: string;
};

const generateRandomName = () => {
  let result = "";

  const names = [
    "Dog",
    "Pony",
    "Jeff",
    "Brandon",
    "Sally",
    "Boy",
    "Derick",
    "Wing",
    "Chief",
    "Taco",
    "Burger",
    "Apple",
    "X",
    "Girly",
    "Grizzly",
    "Panda",
    "Polar",
  ];

  for (let i = 0; i < 2; i++) {
    result += names.at(Math.floor(Math.random() * names.length));
    result += " ";
  }
  return result.trimEnd();
};

const IDENTITY_KEY = "identity" as const;

export function useIdentity() {
  const [identity, setIdentity] = useState<User | null>(null);

  useEffect(() => {
    const identityString = localStorage.getItem(IDENTITY_KEY);
    if (!identityString) {
      initializeIdentity();
      return;
    }

    const identity = JSON.parse(identityString) as User;
    console.log("initializeIdentity", identity);

    setIdentity(identity);
  }, []);

  function initializeIdentity() {
    const identity = {
      id: crypto.randomUUID(),
      name: generateRandomName(),
    };

    console.log("initializeIdentity", identity);

    localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
    setIdentity(identity);
  }

  return {
    identity,
  };
}
