import React, { useState, useEffect, useContext } from "react";
import { WebSocketContext } from "../WebSocketContext";
import GroupList from "./GroupList/GroupList";
import ChatWindow from "./ChatWindow/ChatWindow";

function MainContent() {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [showTaskCards, setShowTaskCards] = useState(true);
  const { ws, groups, setGroups, setMessages, messages, commID2Name } =
    useContext(WebSocketContext);
  const [loading, setLoading] = useState(false); // 添加加载状态

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

  // when groups change and is currently loading, set loading to false
  // and set selectedGroup to the first group
  useEffect(() => {
    if (groups.length > 0 && loading) {
      setLoading(false);
      setSelectedGroup(groups[0].comm_id);
      setSelectedId(groups[0].comm_id);
    }
  }, [groups]);

  let selectedMessages = messages[selectedGroup] || [];

  const handleGroupSelect = (group) => {
    setSelectedGroup(group);
    setSelectedId(group);
    setShowTaskCards(false);
    setLoading(false);
  };

  const resetChat = () => {
    setSelectedGroup(null);
    setSelectedId(null);
    setShowTaskCards(true);
    setLoading(false);
  };

  return (
    <div className="app-container">
      <GroupList 
        groups={groups} 
        onGroupSelect={handleGroupSelect} 
        selectedId={selectedId}
      />
      <ChatWindow
        messages={selectedMessages}
        teamName={
          selectedGroup ? commID2Name[selectedGroup] : "Internet of Agents"
        }
        showTaskCards={showTaskCards}
        setShowTaskCards={setShowTaskCards}
        resetChat={resetChat}
        loading={loading} // 传递加载状态
        setLoading={setLoading} // 传递设置加载状态的方法
      />
    </div>
  );
}

export default MainContent;