"use client";
import { useEffect, useState } from "react";
import { onGetUserAction } from "../actions";

export default function WhoAmIServerAction() {
  const [user, setUser] = useState<string | null>();

  useEffect(() => {
    onGetUserAction().then((user) => setUser(user));
  }, []);

  return <div className="mt-5">Who Am I (server action): {user}</div>;
}