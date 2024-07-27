import React, { createContext, useState, useContext } from 'react';

const GroupContext = createContext();

export const GroupProvider = ({ children }) => {
  const [selectedGroup, setSelectedGroup] = useState(null);

  return (
    <GroupContext.Provider value={{ selectedGroup, setSelectedGroup }}>
      {children}
    </GroupContext.Provider>
  );
};

export const useGroup = () => {
  return useContext(GroupContext);
};
