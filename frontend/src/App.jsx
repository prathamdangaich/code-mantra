import React from 'react'
import './App.css';
import io from 'socket.io-client'
import { useState, useEffect, useMemo } from 'react';
import Editor from '@monaco-editor/react';

const socket = io('http://localhost:3000');



function App() {

  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [language, setLanguage] = useState('cpp');
  const [code,setCode] = useState('//Start coding here');
  const [copySuccess, setCopySuccess] = useState("");
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState("");

  useEffect( () => {
    socket.on("userJoined", (users) => {
      setUsers(users);
    });

    socket.on("codeUpdate", (newCode) => {
      setCode(newCode);
    })

    socket.on("userTyping", (user) => {
      setTyping(`${user} is typing..`)
      setTimeout( () => {
        setTyping("");
      },3000)
    })

    socket.on("languageUpdate", (newLanguage) => {
      setLanguage(newLanguage);
    })

    return () => {
      socket.off("userJoined");
      socket.off("codeUpdate");
      socket.off("userTyping");
      socket.off("languageUpdate");
    }
  }, [])

  useEffect( () => {
    const handleBeforeUnload = () => {
      socket.emit("leaveRoom");
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload",handleBeforeUnload);
    }
  }, [])

  const joinRoom = () => {
    if(roomId && userName){
      socket.emit("join", {roomId, userName});
      setJoined(true);
    }
  }

  const leaveRoom = () => {
    socket.emit("leaveRoom");
    setJoined(false);
    setRoomId("");
    setUserName("");
    setCode("//Start coding here");
    setLanguage("cpp");
  }

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId)
    setCopySuccess("Copied to clipboard!");
    setTimeout( () => {
      setCopySuccess("")
    },2000);
  }

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    socket.emit("codeChange", {roomId, code: newCode});
    socket.emit("typing", {roomId, userName});
  }

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    socket.emit("languageChange", {roomId, language: newLanguage});
  }

  if(!joined){
    return(
      <div className="join-container">
        <div className="join-form">
          <h1>Code Mantra</h1>
          <input 
          type="text" 
          placeholder='Room Id'
          value = {roomId}
          onChange={(e) => setRoomId(e.target.value)}
          />

          <input 
          type="text" 
          placeholder='Your Name'
          value = {userName}
          onChange={(e) => setUserName(e.target.value)}
          />

          <button onClick={joinRoom}>Join Room</button>
        </div>
      </div>
    )
  }

  return <div className='editor-container'>
    <div className="sidebar">
      
      <div className="room-info">
        <h1>Code Mantra</h1>
        <h2>Room ID: {roomId}</h2>
        <button className='copy-button' onClick={copyRoomId}>Copy Room ID</button>
        {copySuccess && <span className='copy-success'>{copySuccess}</span>}
      </div>

      <h3>Users in Room:</h3>
      
      <ul>
        {
          users.map((user,index) => (
            <li key={index}>{user.slice(0,8)}</li>
          ))
        }
      </ul>
      
      <p className='typing-indicator'> {typing} </p>
      
      <select className='language-select' value={language} onChange = { handleLanguageChange }>
        <option value="javascript">JavaScript</option>
        <option value="python">Python</option>
        <option value="cpp">C++</option>
        <option value="java">Java</option>
      </select>
      
      <button className='leave-button' onClick={leaveRoom}>Leave Room</button>
    </div>
    
    <div className="editor-wrapper">
      <Editor 
        height={"100%"} 
        defaultLanguage = {language} 
        language={language} 
        value={code}
        onChange={handleCodeChange}
        theme="vs"
        options= {
          {
            minimap: {enabled: false},
            fontSize: 14
          }
        }
      />
    </div>

  </div>

  
}

export default App
