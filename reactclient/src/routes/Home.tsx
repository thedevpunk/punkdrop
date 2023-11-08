import { FormEvent, useRef, useState } from "react";
import { WebSocketMessage, useWebSocket } from "../hooks/useWebSocket";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { ScrollArea } from "../components/ui/scroll-area";
import { Copy, X } from "lucide-react";
import { Group, useGroups } from "@/hooks/useGroups";
import { Link, useParams } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const generateRandomKey = (length: number) => {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

function Home() {
  const { groups, addGroup, removeGroup } = useGroups();

  const createNewGroup = () => {
    const key = generateRandomKey(10);
    const newGroup: Group = {
      key,
      name: key,
    };
    addGroup(newGroup);
  };

  const joinGroup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const groupKey = event.currentTarget.groupKey.value;

    const newGroup: Group = {
      key: groupKey,
      name: groupKey,
    };
    addGroup(newGroup);
  };

  const deleteGroup = (key: string) => {
    removeGroup(key);
  };

  return (
    <div className="h-screen w-screen bg-slate-50 flex items-center justify-center">
      <Card className="w-full max-w-xl">
        {/* header */}
        <div className="font-bold h-16 flex items-center justify-between gap-2 px-8 py-4 border-b border-slate-100">
          <div className="flex gap-2 items-center">
            <p>Punkdrop</p>
          </div>
        </div>
        {/* body */}
        <div className="flex">
          <div className="flex flex-col flex-grow gap-4 px-6 py-4 border-r border-slate-200">
            Select a group from the list or create one if you don't have one
            yet. <br />
            You can share the group key with your friends so they can join your
            group.
          </div>
          <div className="flex flex-col gap-4 px-6 py-4">
            {groups.length === 0 && <p>No groups yet</p>}

            <div className="flex flex-col gap-1">
              {groups.map((group) => (
                <Link
                  to={`group/${group.key}`}
                  className="px-4 py-2 rounded hover:bg-slate-100"
                >
                  {group.name}
                </Link>
              ))}
            </div>

            <Button className="w-full" onClick={createNewGroup}>
              Create group
            </Button>
            <Popover>
              <PopoverTrigger>
                <Button variant="ghost">Join group</Button>
              </PopoverTrigger>
              <PopoverContent>
                <form onSubmit={joinGroup} className="flex flex-col gap-4">
                  {/* <Label htmlFor="key">Group key</Label> */}
                  <Input
                    type="text"
                    id="groupKey"
                    name="groupKey"
                    placeholder="Your group key"
                  />
                  <Button>Join</Button>
                </form>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* <form onSubmit={() => null} className="flex gap-4 flex-col">
              <h2>Send messages via Websocket</h2>
              <Label htmlFor="receiver">To</Label>
              <Input
                type="text"
                id="receiver"
                name="receiver"
                placeholder="Your best friends name"
              />
              <Label htmlFor="message">Your message</Label>
              <Textarea
                id="message"
                name="message"
                rows={4}
                placeholder="Write your thoughts here..."
              />
              <Button>Send</Button>
            </form> */}
      </Card>
      {/* <Card>
          <header className="font-bold h-16 flex items-center justify-between gap-2 px-8 py-4 border-b border-slate-100">
            <h2>WebSocket history</h2>
          </header>
          <main className="px-8 py-4">
            <ScrollArea>
              {messages.map((message) => {
                const isMyMessage = message.sender === userKeyRef.current;

                switch (message.type) {
                  case "text":
                    return (
                      <div
                        className={`text-xs mb-3 ${
                          isMyMessage ? "text-right" : ""
                        }`}
                      >
                        <p className="">{message.sender}</p>
                        <p
                          className={`px-2 py-1 rounded ${
                            isMyMessage
                              ? "bg-slate-100"
                              : "bg-slate-600 text-white"
                          }`}
                        >
                          {message.content}
                        </p>
                      </div>
                    );

                  default:
                    return null;
                }
              })}
            </ScrollArea>
          </main>
        </Card> */}
    </div>
  );
}

export default Home;
