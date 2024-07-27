import React, { useState, useEffect, useRef, useCallback } from "react";
import Message from "../Message/Message"; // Assuming you have a Message component
import "./ChatWindow.css"; // Assuming you have a CSS file
import ReactMarkdown from 'react-markdown';
import sendIcon from '../ChatWindow/submit_icon.png';
import chatIcon from '../ChatWindow/new_chat.png';
import shareIcon from '../ChatWindow/share.png';
import frontedIcon1 from '../ChatWindow/frontedIcon1.png';
import frontedIcon2 from '../ChatWindow/frontedIcon2.png';
import frontedIcon3 from '../ChatWindow/frontedIcon3.png';
import frontedIcon4 from '../ChatWindow/frontedIcon4.png';
import logoIcon from '../ChatWindow/IoA_logo.png';

function ChatWindow({ messages, teamName, showTaskCards, setShowTaskCards, resetChat }) { 
  const [displayMessages, setDisplayMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [shouldScroll, setShouldScroll] = useState(false);
  const scrollRef = useRef(null);
  const ws = useRef(null);
  const ws_url = "ws://localhost:7788/chatlist_ws";

  const connectWebSocket = () => {
    ws.current = new WebSocket(ws_url);

    ws.current.onopen = () => {
      // 心跳检测重置
      handleHeartCheck.reset().start();
      // ws.current.send("hello")
      console.log("WebSocket connection opened");
    };
    
    ws.current.onmessage = (event) => {
      const data = event.data;
      console.log("Received message:", data);
      setDisplayMessages((prevMessages) => [...prevMessages, { message: data }]);
    };

    ws.current.onmessage = handleWebSocketMessage;

    ws.current.onclose = (event) => {
      // 重新连接websocket
      reContent(ws_url);
      console.log("WebSocket connection closed:", event);
      // setTimeout(connectWebSocket, 1000);
    };

    ws.current.onerror = (error) => {
      // 重新连接websocket
      reContent(ws_url);
      console.log("WebSocket error:", error);
    };
  };


  useEffect(() => {
    connectWebSocket();

    return () => {
      if (window.onbeforeunload) {
        ws.current.close();
      }
    };
  }, []);


  useEffect(() => {
    console.log(messages);
    const isAtBottom = (() => {
      if (!scrollRef.current) return false;

      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const threshold = 5; // Margin of error for the bottom check
      return scrollTop >= scrollHeight - clientHeight - threshold;
    });
    setShouldScroll(isAtBottom());
    if (messages) {
      setDisplayMessages(messages);
    }

  }, [messages]);

  useEffect(() => {
    const scrollToBottom = (() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });

    if (shouldScroll) {
      scrollToBottom();
    }
  }, [displayMessages]);


  // 重新连接websocket
  const reContent = () => {
    // 延迟避免请求过多
    setTimeout(function () {
      connectWebSocket();
    }, 2000);
  };


  //websocket心跳检测
  const handleHeartCheck = {
    timeout: 5000,
    timeoutObj: null, // 执行心跳的定时器
    serverTimeoutObj: null, // 服务器超时的定时器
    
    // 重置方法
    reset: function() { 
      clearTimeout(this.timeoutObj);
      clearTimeout(this.serverTimeoutObj);
      return this;
    } ,

    // 启动方法
    start: function() {
      // const self = this;
      // this.timeoutObj = setTimeout(function() {
      //   ws.current.send(JSON.stringify({ type: "heartbeat" }));
      //   self.serverTimeoutObj = setTimeout(function() {
      //     ws.current.close();
      //   }, self.timeout); 
      // }, this.timeout);
    }
  };


  const handleInputChange = (event) => {
    setNewMessageText(event.target.value);
  };


  const handleSubmit = (event) => {
    event.preventDefault();
    if (newMessageText.trim() !== "") {
      const message = {
        content: newMessageText,
        sender: "User",
        updated_plan: false,
        comm_id: "",
      };
  
      // 发送消息到 WebSocket
      ws.current.send(JSON.stringify(message));
  
      // 更新本地状态以显示消息
      setDisplayMessages((prevMessages) => [...prevMessages, message]);
  
      // 清空输入框
      setNewMessageText("");
      setShowTaskCards(false); // 发送消息后隐藏task-cards
    }
  };


  const handleWebSocketMessage = (event) => {};

  const title = teamName;

  return (
    <div className="chat-window">
        {/* <span className="group-name">{group.team_name}</span> */}
      <div className="right-header-bar">
        <span className="group-name">INTERNET OF AGENTS</span>
        <div className="actions"> {/* 包裹 New chat 和 Share 的 div */}
          <div className="new-chat" onClick={resetChat}>
            <img src={chatIcon} alt="Chat" className="chat-img" />
            <span className="username-chat">New chat</span>
          </div>
          <div className="share">
            <img src={shareIcon} alt="Share" className="share-img" />
            <span className="username">Share</span>
          </div>
        </div>
      </div>

      

      <div className="chat-messages" ref={scrollRef}>
        {/* {displayMessages.length > 0 && (
          <div className="chat-goal">
            <span className="chat-goal-title">Goal:</span>
            <ReactMarkdown className="chat-goal-content">
              {displayMessages[0].goal}
            </ReactMarkdown>
          </div>
        )} */}
        {displayMessages.map((message, index) => (
          <Message key={message.comm_id + "-" + index} message={message} />
        ))}
        {showTaskCards && (
          <div className="task-cards-container">
            <div className="task-cards-header">
              <img src={logoIcon} alt="Logo" className="task-cards-logo" />
              <span className="task-cards-title">Internet of Agents</span>
            </div>
            <div className="task-cards">
              <div className="task-card">
                <img src={frontedIcon1} alt="Plan a relaxing day" />
                <span>The agent sends and registers social software</span>
              </div>
              <div className="task-card">
                <img src={frontedIcon2} alt="Text inviting friend to wedding" />
                <span>Autonomous nested team formation</span>
              </div>
              <div className="task-card">
                <img src={frontedIcon3} alt="Make me a personal webpage" />
                <span>Autonomous conversation flow control</span>
              </div>
              <div className="task-card">
                <img src={frontedIcon4} alt="Study vocabulary" />
                <span>Task allocation and execution</span>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="message-container">
        <form className="message-input" onSubmit={handleSubmit}>
          <input
            type="text"
            value={newMessageText}
            onChange={handleInputChange}
            placeholder="Type your message..."
          />
          <button type="submit" className="send-button">
            <img src={sendIcon} alt="Send" />
          </button>
        </form>
      </div>
    </div >
  );
}

export default ChatWindow;
