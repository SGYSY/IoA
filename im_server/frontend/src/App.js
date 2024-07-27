// import React, { useState, useEffect } from "react";
// import "./App.css";
// import GroupList from "./components/GroupList/GroupList";
// import ChatWindow from "./components/ChatWindow/ChatWindow";

// function App() {
//   // Left panel
//   const [groups, setGroups] = useState([]);

//   // All right panel data
//   const [messages, setMessages] = useState({});
//   const [selectedGroup, setSelectedGroup] = useState(null);
//   const [showTaskCards, setShowTaskCards] = useState(true);

//   let commID2Name = {};
//   let socket; // WebSocket object

//   function update_message(message) {
//     setMessages((prevMessages) => {
//       const chatId = message.comm_id;
//       const currentMessages = prevMessages[chatId] || [];
//       return {
//         ...prevMessages,
//         [chatId]: [...currentMessages, message],
//       };
//     });
//   }

//   useEffect(() => {
//     const MAX_RETRIES = 3;
//     const RETRY_INTERVAL = 3000;
//     let connectionEstablished = false;

//     function connectWebSocket() {
//       socket = new WebSocket("ws://127.0.0.1:7788/chatlist_ws");

//       socket.onopen = () => {
//         console.log("WebSocket connection established!");
//         connectionEstablished = true;
//       };

//       socket.onmessage = (event) => {
//         const message = JSON.parse(event.data);
//         console.log(message);
//         switch (message.frontend_type) {
//           case "teamup":
//             setGroups((prevGroups) => [
//               {
//                 comm_id: message.comm_id,
//                 agent_names: message.agent_names,
//                 team_name: message.team_name || message.agent_names.join(", "),
//               },
//               ...prevGroups,
//             ]);
//             commID2Name[message.comm_id] = message.team_name;
//             break;
//           case "message":
//             update_message(message);
//             let commId = message.comm_id;
//             setGroups((prevGroups) => {
//               return prevGroups.map((group) => {
//                 if (group.comm_id === commId) {
//                   group.latest_message = `[${message.sender}]: ${message.content}`;
//                 }
//                 return group;
//               });
//             });
//             break;

//           default:
//             break;
//         }
//       };

//       socket.onerror = (error) => {
//         console.error("WebSocket error:", error);
//         connectionEstablished = false;
//       };

//       socket.onclose = (event) => {
//         console.log("WebSocket connection closed:", event);
//         connectionEstablished = false;
//       };
//     }

//     let retries = 0;
//     const intervalId = setInterval(() => {
//       if (!connectionEstablished && retries < MAX_RETRIES) {
//         connectWebSocket();
//         retries++;
//       } else {
//         clearInterval(intervalId);
//       }
//     }, RETRY_INTERVAL);

//     return () => {
//       clearInterval(intervalId);
//       if (socket) {
//         socket.close();
//       }
//     };
//   }, []);

//   useEffect(() => {
//     fetch("http://127.0.0.1:7788/fetch_chat_record", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({}),
//     })
//       .then((response) => response.json())
//       .then((data) => {
//         console.log("Success:", data);
//         let newMessages = {};
//         let newGroups = [];
//         for (const comm_id in data) {
//           let chatRecord = data[comm_id]["chat_record"];
//           let agentNames = data[comm_id]["agent_names"];
//           let teamName = data[comm_id]["team_name"] || agentNames.join(", ");
//           commID2Name[comm_id] = teamName;
//           chatRecord.forEach((message) => {
//             newMessages[comm_id] = newMessages[comm_id] || [];
//             newMessages[comm_id].push(message);
//           });

//           let latestMessage = chatRecord[chatRecord.length - 1] || null;
//           newGroups = [
//             {
//               comm_id: comm_id,
//               agent_names: agentNames,
//               latest_message: latestMessage
//                 ? `[${latestMessage.sender}]: ${latestMessage.content}`
//                 : "",
//               team_name: teamName,
//             },
//             ...newGroups,
//           ];
//         }
//         setMessages(newMessages);
//         setGroups(newGroups);
//       })
//       .catch((error) => {
//         console.error("Error:", error);
//       });
//   }, []);

//   let selectedMessages = messages[selectedGroup] || [];

//   const handleGroupSelect = (group) => {
//     setSelectedGroup(group);
//     setShowTaskCards(false);
//   };

//   return (
//     <div className="app-container">
//       <GroupList groups={groups} onGroupSelect={handleGroupSelect} />
//       <ChatWindow
//         messages={selectedMessages}
//         teamName={selectedGroup ? commID2Name[selectedGroup] : "Select a group"}
//         showTaskCards={showTaskCards}
//         setShowTaskCards={setShowTaskCards} // 传递回调函数
//       />
//     </div>
//   );
// }

// export default App;


import React, { useState, useEffect } from "react";
import "./App.css";
import GroupList from "./components/GroupList/GroupList";
import ChatWindow from "./components/ChatWindow/ChatWindow";

function App() {
  const [groups, setGroups] = useState([]);
  const [messages, setMessages] = useState({});
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showTaskCards, setShowTaskCards] = useState(true);

  let commID2Name = {};
  let socket;

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
    const MAX_RETRIES = 3;
    const RETRY_INTERVAL = 3000;
    let connectionEstablished = false;

    function connectWebSocket() {
      socket = new WebSocket("ws://127.0.0.1:7788/chatlist_ws");

      socket.onopen = () => {
        console.log("WebSocket connection established!");
        connectionEstablished = true;
      };

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
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
            commID2Name[message.comm_id] = message.team_name;
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

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        connectionEstablished = false;
      };

      socket.onclose = (event) => {
        console.log("WebSocket connection closed:", event);
        connectionEstablished = false;
      };
    }

    let retries = 0;
    const intervalId = setInterval(() => {
      if (!connectionEstablished && retries < MAX_RETRIES) {
        connectWebSocket();
        retries++;
      } else {
        clearInterval(intervalId);
      }
    }, RETRY_INTERVAL);

    return () => {
      clearInterval(intervalId);
      if (socket) {
        socket.close();
      }
    };
  }, []);

  useEffect(() => {
    fetch("http://127.0.0.1:7788/fetch_chat_record", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Success:", data);
        let newMessages = {};
        let newGroups = [];
        for (const comm_id in data) {
          let chatRecord = data[comm_id]["chat_record"];
          let agentNames = data[comm_id]["agent_names"];
          let teamName = data[comm_id]["team_name"] || agentNames.join(", ");
          commID2Name[comm_id] = teamName;
          chatRecord.forEach((message) => {
            newMessages[comm_id] = newMessages[comm_id] || [];
            newMessages[comm_id].push(message);
          });

          let latestMessage = chatRecord[chatRecord.length - 1] || null;
          newGroups = [
            {
              comm_id: comm_id,
              agent_names: agentNames,
              latest_message: latestMessage
                ? `[${latestMessage.sender}]: ${latestMessage.content}`
                : "",
              team_name: teamName,
            },
            ...newGroups,
          ];
        }
        setMessages(newMessages);
        setGroups(newGroups);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  }, []);

  let selectedMessages = messages[selectedGroup] || [];

  const handleGroupSelect = (group) => {
    setSelectedGroup(group);
    setShowTaskCards(false);
  };

  return (
    <div className="app-container">
      <GroupList groups={groups} onGroupSelect={handleGroupSelect} />
      <ChatWindow
        messages={selectedMessages}
        teamName={selectedGroup ? commID2Name[selectedGroup] : "Select a group"}
        showTaskCards={showTaskCards}
        setShowTaskCards={setShowTaskCards} // 传递回调函数
      />
    </div>
  );
}

export default App;
