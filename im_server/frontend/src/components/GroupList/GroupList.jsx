import React from "react";
import "./GroupList.css";
import getAvatar from "../../utils/avatar";
import logoIcon from '../ChatWindow/IoA_logo.png';

function AvatarGrid({ members }) {
  const getGridClass = () => {
    const count = members.length;
    if (count === 1) return "avatar-grid-one";
    if (count === 2) return "avatar-grid-two";
    if (count === 3) return "avatar-grid-three";
    return "avatar-grid-four"; // For four or more avatars
  };

  return (
    <div className={`avatar-square ${getGridClass()}`}>
      {members.slice(0, 4).map((name, index) => (
        <img
          key={index}
          src={getAvatar(name)}
          alt={`Avatar of ${name}`}
          className={`avatar-group-list avatar-${index}`}
        />
      ))}
    </div>
  );
}

function GroupList({ groups, onGroupSelect, selectedId }) {
  const handleChatClick = (chatId) => {
    onGroupSelect(chatId);
  };

  return (
    <div className="chat-list">
      <div className="left-header-bar">
        <div className="logo">
          <img src={logoIcon} alt="Logo" className="logo-img"></img>
          <span className="username-logo">IoA</span>
        </div>
        <div className="menu">☰</div>
      </div>
      <ul>
        {groups.map((group) => (
          <li
            key={group.comm_id}
            onClick={() => handleChatClick(group.comm_id)}
            className={selectedId === group.comm_id ? "chat-item-selected" : "chat-item"}
          >
            <AvatarGrid members={group.agent_names} />
            <div className="group-info">
              <span className="group-name">{group.team_name}</span>
              <span className="group-description">{group.latest_message}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default GroupList;