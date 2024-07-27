import React, { createContext, useEffect, useState } from "react";

export const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const [ws, setWs] = useState(null);
  // Left panel
  const [groups, setGroups] = useState([
    // { comm_id: "1", agent_names: ["asdf", "dfdfdf"] },
    // { comm_id: "2", agent_names: ["Friends"] },
  ]);

  // All right panel data
  const [messages, setMessages] = useState({
    // comm_id: [{
    //   comm_id: "xx",
    //   sender: "xx",
    //   content: "xx",
    //   goal: "xx",
    //   next_speaker: ["xx"],
    //   state: 0,
    //   task_abstract: "",
    //   task_conclusion: "",
    //   task_desc: "",
    //   task_id: "",
    //   team_members: [""],
    //   team_up_depth: 1,
    //   triggers: [],
    // }],
  });
  const [commID2Name, setCommID2Name] = useState({});

  function update_message(message) {
    setMessages((prevMessages) => {
      const chatId = message.comm_id;
      const currentMessages = prevMessages[chatId] || [];
      return {
        ...prevMessages,
        [chatId]: [...currentMessages, message],
      };
    });
  }

  useEffect(() => {
    const socket = new WebSocket("ws://127.0.0.1:7788/chatlist_ws");
    socket.onopen = () => {
      console.log("WebSocket connected");
    };
    socket.onclose = () => {
      console.log("WebSocket disconnected");
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data); // Assuming the message is in JSON format
      console.log(message);
      switch (message.frontend_type) {
        case "teamup":
          setGroups((prevGroups) => [
            {
              comm_id: message.comm_id,
              agent_names: message.agent_names,
              team_name: message.team_name || message.agent_names.join(", "),
            },
            ...prevGroups,
          ]);
          // commID2Name[message.comm_id] = message.team_name;
          setCommID2Name((prevCommID2Name) => {
            prevCommID2Name[message.comm_id] = message.team_name;
            return prevCommID2Name;
          });
          break;
        case "message":
          update_message(message);
          let commId = message.comm_id;
          setGroups((prevGroups) => {
            return prevGroups.map((group) => {
              if (group.comm_id === commId) {
                group.latest_message = `[${message.sender}]: ${message.content}`;
              }
              return group;
            });
          });
          break;

        default:
          break;
      }
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, []);

  return (
    <WebSocketContext.Provider
      value={{ ws, groups, setGroups, setMessages, messages, commID2Name }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};
