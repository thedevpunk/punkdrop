import { FormEvent, useRef, useState } from "react";
import { WebSocketMessage, useWebSocket } from "../hooks/useWebSocket";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { ScrollArea } from "../components/ui/scroll-area";
import { Copy } from "lucide-react";

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

function Group() {
  const userKeyRef = useRef(generateRandomKey(10));
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);

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

  const submitSendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

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
  };

  const handleCopyKeyToClipboard = () => {
    navigator.clipboard.writeText(userKeyRef.current);
  };

  return (
    <div className="h-screen w-screen bg-slate-50 flex items-center justify-center">
      <div className="flex gap-4">
        <Card>
          <header className="font-bold h-16 flex items-center justify-between gap-2 px-8 py-4 border-b border-slate-100">
            <div className="flex gap-2 items-center bg-slate-100 border border-slate-200 rounded-md px-4 h-10">
              <p className="">{userKeyRef.current}</p>
              <Button
                variant={"link"}
                className="px-0"
                onClick={handleCopyKeyToClipboard}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2 items-center">
              <p>WebSocket</p>
              <div className={`w-4 h-4 rounded-lg bg-yellow-300`}></div>
              {/* <div
                className={`w-4 h-4 rounded-lg ${
                  webSocketState === "pending" ? " bg-yellow-300" : ""
                }${webSocketState === "open" ? "bg-green-400" : ""}${
                  webSocketState === "closed" ? "bg-red-400" : ""
                }`}
              ></div> */}
            </div>
          </header>
          <main className="px-8 py-4">
            <form onSubmit={submitSendMessage} className="flex gap-4 flex-col">
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
            </form>
          </main>
        </Card>
        <Card>
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
        </Card>
      </div>
    </div>
  );
}

export default Group;
