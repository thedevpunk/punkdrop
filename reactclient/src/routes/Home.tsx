import { FormEvent, useRef, useState } from "react";
import { WebSocketMessage, useWebSocket } from "../hooks/useWebSocket";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { ScrollArea } from "../components/ui/scroll-area";
import { Copy } from "lucide-react";
import { Group, useGroups } from "@/hooks/useGroups";

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

  const deleteGroup = (key: string) => {
    removeGroup(key);
  };

  //   const userKeyRef = useRef(generateRandomKey(10));
  //   const [messages, setMessages] = useState<WebSocketMessage[]>([]);

  //   const [webSocketState, sendOverWebSocket] = useWebSocket({
  //     url: `ws://localhost:8080/ws?key=${userKeyRef.current}`,
  //     offerHandler: (message) =>
  //       setMessages((messages) => [...messages, message]),
  //     answerHandler: (message) =>
  //       setMessages((messages) => [...messages, message]),
  //     candidateHandler: (message) =>
  //       setMessages((messages) => [...messages, message]),
  //     textHandler: (message) => setMessages((messages) => [...messages, message]),
  //   });

  //   const submitSendMessage = (event: FormEvent<HTMLFormElement>) => {
  //     event.preventDefault();

  //  const receiver = event.currentTarget.receiver.value;
  //  const content = event.currentTarget.message.value;

  //  const message: WebSocketMessage = {
  //    type: "text",
  //    sender: userKeyRef.current,
  //    receiver,
  //    content,
  //  };

  //  setMessages((messages) => [...messages, message]);
  //  sendOverWebSocket(message);
  //   };

  //   const handleCopyKeyToClipboard = () => {
  //     navigator.clipboard.writeText(userKeyRef.current);
  //   };

  return (
    <div className="h-screen w-screen bg-slate-50 flex items-center justify-center">
      <div className="flex gap-4">
        <Card>
          {/* header */}
          <div className="font-bold h-16 flex items-center justify-between gap-2 px-8 py-4 border-b border-slate-100">
            <div className="flex gap-2 items-center">
              <p>Punkdrop</p>
            </div>
          </div>
          {/* body */}
          <div className="px-8 py-4">
            <p>Groups</p>

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
          </div>
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
    </div>
  );
}

export default Home;
